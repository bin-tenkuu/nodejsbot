import http, {IncomingMessage, ServerResponse} from "http";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {logger} from "../utils/logger.js";

class HttpOption extends Plug {
	private header?: http.Server;

	constructor() {
		super(module);
		this.name = "网页指令";
		this.description = "通过网页链接达到控制效果";
		this.version = 0.6;
	}

	handle(req: IncomingMessage, res: ServerResponse) {
		res.setHeader("Content-type", "text/html; charset=utf-8");
		logger.info(`网页 '${req.url}' 收到请求`);
		logger.info(`代理:\t${req.headers["x-forwarded-for"]}`);
		let {remoteFamily: family, remoteAddress: address, remotePort: port} = req.socket;
		logger.info(`远程地址:\t${family} -> ${address} : ${port}`);
		if (req.url !== "/exit") {
			return res.end("<a href='./exit'>http://127.0.0.1:40000/exit</a>");
		}
		res.end("开始退出\n");
		this.allExit();
	}

	async install() {
		let server = http.createServer((req, res) => {
			this.handle(req, res);
		}).listen(40000, "127.0.0.1");
		logger.info("快速结束已启动,点击 http://127.0.0.1:40000");
		this.header = server;
	}

	async uninstall() {
		this.header?.close();
	}

	@canCallPrivate()
	@canCallGroup()
	async exit(): Promise<never[]> {
		this.allExit();
		return [];
	}

	allExit() {
		Promise.all([...(Plug.plugs.values())].map((p) => p.uninstall())).then<void>(() => {
			logger.info(">>>>>>>>>> 全部卸载完成 <<<<<<<<<<");
			if (process.execArgv.includes("--inspect")) { return; }
			setTimeout(() => {
				console.log("退出");
				process.exit(0);
			}, 500);
		});
	}
}

export default new HttpOption();