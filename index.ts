import {Plug} from "./Plug.js";
import CQBot from "./plugs/CQBot.js";
import CQBotCOC from "./plugs/CQBotCOC.js";
import CQBotEvent from "./plugs/CQBotEvent.js";
import CQBotPicture from "./plugs/CQBotPicture.js";
import CQBotPlugin from "./plugs/CQBotPlugin.js";
import CQBotRepeat from "./plugs/CQBotRepeat.js";
import CQBotSearch from "./plugs/CQBotSearch.js";
import CQData from "./plugs/CQData.js";
import DefaultMsg from "./plugs/DefaultMsg.js";
import httpOption from "./plugs/httpOption.js";
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
	await CQData.install();
	await httpOption.install();
	await CQBot.install();

	await CQBotCOC.install();
	await CQBotEvent.install();
	await CQBotPlugin.install();
	await CQBotRepeat.install();
	await CQBotSearch.install();
	await CQBotPicture.install();
	await DefaultMsg.install();
	Plug.hrtime(time, "初始化");
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
