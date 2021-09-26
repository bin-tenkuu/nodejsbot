import {Plug} from "./Plug.js";
import {logger} from "./utils/logger.js";

declare global {
	function NOP(e: any): void

	function IsDebug(): boolean;
}
global.NOP = (e) => logger.debug(e);
global.IsDebug = process.execArgv.includes("--inspect") ? () => true : () => false;

//*
Promise.resolve().then(async () => {
	let time = process.hrtime();
	await require("./plugs/CQData").default.install();
	await require("./plugs/httpOption").default.install();
	await require("./plugs/CQBot").default.install();

	await require("./plugs/CQBotCOC").default.install();
	await require("./plugs/CQBotEvent").default.install();
	await require("./plugs/CQBotPlugin").default.install();
	await require("./plugs/CQBotRepeat").default.install();
	await require("./plugs/CQBotSearch").default.install();
	await require("./plugs/CQBotPicture").default.install();
	// await require("./plugs/test").default;
	Plug.hrtime(time, "初始化");
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
