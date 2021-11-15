import "reflect-metadata";
import {Plug} from "./Plug.js";
console.log(Plug);
import {Counter} from "./plugs/Counter.js";
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
import {Logable, logger} from "./utils/logger.js";

declare global {
	function NOP(e: any): void

	function IsDebug(): boolean;
}
global.NOP = (e) => logger.debug(e);
global.IsDebug = process.execArgv.includes("--inspect") ? () => true : () => false;
// 传入构造函数，自动生成
//*
Promise.resolve().then(async () => {
	const time = process.hrtime();
	await CQData.getInst().install();
	await HttpOption.getInst().install();
	await CQBot.getInst().install();

	await CQBotCOC.getInst().install();
	await CQBotEvent.getInst().install();
	await CQBotPlugin.getInst().install();
	await CQBotRepeat.getInst().install();
	await CQBotSearch.getInst().install();
	await CQBotPicture.getInst().install();
	await DefaultMsg.getInst().install();
	await Counter.getInst().install();
	Logable.hrtime(time, "初始化");
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
