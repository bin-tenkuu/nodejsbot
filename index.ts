const time = process.hrtime();
import "reflect-metadata";
import {getLogger, hrtime} from "@U/logger.js";
import {Counter} from "@S/Counter.js";
import {CQBotCOC} from "@S/CQBotCOC.js";
import {CQBotRepeat} from "@S/CQBotRepeat.js";
import {CQBotSearch} from "@S/CQBotSearch.js";
import {CQData} from "@S/CQData.js";
import {DefaultMsg} from "@S/DefaultMsg.js";
import {HttpOption} from "@S/httpOption.js";
import {CQBotPicture} from "@S/CQBotPicture.js";
import {CQBot} from "@P/CQBot.js";
import {CQBotEvent} from "@P/CQBotEvent.js";
import {CQBotPlugin} from "@P/CQBotPlugin.js";

global.logger = getLogger("global");
global.NOP = (e) => global.logger.debug(e);
global.require = require;

//*
Promise.resolve().then(async () => {
	// 优先加载不依赖其他包的插件
	await CQData.getInst().install();
	await HttpOption.getInst().install();
	await Counter.getInst().install();
	await CQBotCOC.getInst().install();
	await CQBotRepeat.getInst().install();
	await CQBotSearch.getInst().install();
	await DefaultMsg.getInst().install();
	// 加载依赖其他包的插件
	await CQBot.getInst().install();
	await CQBotEvent.getInst().install();
	await CQBotPicture.getInst().install();
	await CQBotPlugin.getInst().install();
}).then(() => {
	global.logger.info("启动完成");
	global.logger.info(hrtime(time, "初始化"));
});//*/
