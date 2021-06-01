import {logger} from "./utils/logger.js";

declare global {
  function NOP(): void
}
global.NOP = () => {};

//*
Promise.resolve().then(async () => {
  await require("./plugs/httpOption").default.install();
  await require("./plugs/CQBot.js").default.install();
  
  await require("./plugs/CQBotCOC.js").default;
  await require("./plugs/CQBotEvent.js").default.install();
  await require("./plugs/CQBotPlugin.js").default;
  await require("./plugs/CQBotPokeGroup.js").default.install();
  await require("./plugs/CQBotRandomPicture.js").default;
  await require("./plugs/CQBotRepeat.js").default;
  await require("./plugs/CQBotSauceNAOGroup.js").default;
  await require("./plugs/CQBotPicture.js").default;
  await require("./plugs/test").default;
}).then(() => {
  logger.info("启动完成");
  module.children = [];
});//*/
