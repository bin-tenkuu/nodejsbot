import http, {IncomingMessage, ServerResponse} from "http";
import {Plug} from "../Plug.js";

type ServerHandle = (req: IncomingMessage, res: ServerResponse) => void;

function create(): Map<string, ServerHandle> {
	return new Map<string, ServerHandle>(Object.entries<ServerHandle>({
		"/exit": (req, res) => {
			res.setHeader("Content-type", "text/html; charset=utf-8");
			res.end("开始退出\n");
			Promise.all([...(Plug.plugs.values())].map((p) => p.uninstall())).then<void>(() => {
				HttpOption.logger.info(">>>>>>>>>> 全部卸载完成 <<<<<<<<<<");
				if (IsDebug()) {
					return;
				}
				setTimeout(() => {
					HttpOption.logger.log("退出");
					process.exit(0);
				}, 500);
			});
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
	public server: Map<string, ServerHandle>;
	private header?: http.Server;

	constructor() {
		super(module);
		this.name = "网页指令";
		this.description = "通过网页链接达到控制效果";
		this.server = create();
		// const jpgUrls = Array.from<undefined, string>({length: 3}, (_, k) => `/${k}.jpg`);
		// this.generator = endlessGen(jpgUrls);
	}

	async install() {
		const server = http.createServer(
				this.handle.bind(this),
		).listen(40000, "127.0.0.1");
		this.logger.info("快速结束已启动,点击 http://127.0.0.1:40000");
		this.header = server;
	}

	async uninstall() {
		this.header?.close();
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
