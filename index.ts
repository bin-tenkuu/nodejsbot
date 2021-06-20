import {logger} from "./utils/logger.js";

declare global {
	function NOP(): void
}
global.NOP = () => {};

//*
Promise.resolve().then(async () => {
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
	await require("./plugs/Shares").default;
	await require("./plugs/test").default;
}).then(() => {
	logger.info("启动完成");
	module.children = [];
});//*/
