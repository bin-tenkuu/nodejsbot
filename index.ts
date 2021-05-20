import {logger} from "./utils/logger.js";

declare global {
  function NOP(): void
}
global.NOP = () => {};

//*
Promise.resolve().then(async () => {
  await require("./plugs/httpOption").default.install();
  await require("./plugs/bot").default.install();
  
  await require("./plugs/botCOC").default;
  await require("./plugs/botEvents").default.install();
  await require("./plugs/botPixiv").default;
  await require("./plugs/botPlugin").default;
  await require("./plugs/botPokeGroup").default.install();
  await require("./plugs/botRepeat").default;
  await require("./plugs/botSauceNAOGroup").default;
  await require("./plugs/botPicture.js").default;
  await require("./plugs/botTouHouPNG").default;
  await require("./plugs/test").default;
}).then(() => {
  logger.info("启动完成");
  module.children = [];
});//*/
