import {Plug} from "./Plug.js";
import {CQBot} from "./plugs/CQBot.js";
import {CQBotCOC} from "./plugs/CQBotCOC.js";
import {CQBotEvent} from "./plugs/CQBotEvent.js";
import {CQBotPicture} from "./plugs/CQBotPicture.js";
import {CQBotPlugin} from "./plugs/CQBotPlugin.js";
import {CQBotRepeat} from "./plugs/CQBotRepeat.js";
import {CQBotSearch} from "./plugs/CQBotSearch.js";
import {CQData} from "./plugs/CQData.js";
import {DefaultMsg} from "./plugs/DefaultMsg.js";
import {HttpOption} from "./plugs/httpOption.js";
import {logger} from "./utils/logger.js";

declare global {
	function NOP(e: any): void

	function IsDebug(): boolean;
}
global.NOP = (e) => logger.debug(e);
global.IsDebug = process.execArgv.includes("--inspect") ? () => true : () => false;
// 传入构造函数，自动生成
//*
Promise.resolve().then(async () => {
	let time = process.hrtime();
	await Plug.get(CQData).install();
	await Plug.get(HttpOption).install();
	await Plug.get(CQBot).install();

	await Plug.get(CQBotCOC).install();
	await Plug.get(CQBotEvent).install();
	await Plug.get(CQBotPlugin).install();
	await Plug.get(CQBotRepeat).install();
	await Plug.get(CQBotSearch).install();
	await Plug.get(CQBotPicture).install();
	await Plug.get(DefaultMsg).install();
	Plug.hrtime(time, "初始化");
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
