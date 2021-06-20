import {hrtime, logger} from "./utils/logger.js";

declare global {
	function NOP(): void
}
global.NOP = () => {};

//*
Promise.resolve().then(async () => {
	let time = process.hrtime();
	await require("./plugs/CQData").default.install();
	await require("./plugs/httpOption").default.install();
	await require("./plugs/CQBot").default.install();

	await require("./plugs/CQBotCOC").default;
	await require("./plugs/CQBotEvent").default.install();
	await require("./plugs/CQBotPlugin").default;
	await require("./plugs/CQBotPokeGroup").default;
	await require("./plugs/CQBotRandomPicture").default;
	await require("./plugs/CQBotRepeat").default;
	await require("./plugs/CQBotSearch").default;
	await require("./plugs/CQBotPicture").default;
	await require("./plugs/Shares").default.install();
	await require("./plugs/test").default;
	hrtime(time);
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
