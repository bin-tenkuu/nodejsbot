import http, {IncomingMessage, ServerResponse} from "http";
import {Plug} from "../Plug.js";

type ServerHandle = (req: IncomingMessage, res: ServerResponse) => void;

function create(): Map<string, ServerHandle> {
	return new Map<string, ServerHandle>(Object.entries(<{ [p: string]: ServerHandle }>{
		"/exit": (req, res) => {
			res.setHeader("Content-type", "text/html; charset=utf-8");
			res.end("开始退出\n");
			Plug.exitAll().catch(global.NOP);
		},
		"404": (req, res) => {
			res.writeHead(404);
			HttpOption.logger.warn(`${req.url} 404`);
			// noinspection HtmlUnknownTarget
			return res.end("<a href='/exit'>http://127.0.0.1:40000/exit</a>");
		},
	}));
}

export class HttpOption extends Plug {
	public readonly server: Map<string, ServerHandle> = create();
	private readonly header: http.Server;

	constructor() {
		super(module);
		this.name = "网页指令";
		this.description = "通过网页链接达到控制效果";
		this.header = http.createServer(this.handle.bind(this));
	}

	override async install() {
		this.header.listen(40000, "127.0.0.1");
		this.logger.info("快速结束已启动,点击 http://127.0.0.1:40000");
	}

	override async uninstall() {
		this.header.close();
	}

	private handle(req: IncomingMessage, res: ServerResponse) {
		this.logger.info(`网页 '${req.url}' 收到请求`);
		this.logger.info(`代理:\t${req.headers["x-forwarded-for"]}`);
		const {remoteFamily: family, remoteAddress: address, remotePort: port} = req.socket;
		this.logger.info(`远程地址:\t${family} -> ${address} : ${port}`);
		(this.server.get(req.url ?? "") ?? this[404])(req, res);
	}

	private get 404(): ServerHandle {
		return this.server.get("404") ?? ((_, res) => {
			res.writeHead(404);
			res.end();
		});
	}
}
