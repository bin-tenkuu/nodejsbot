import {logger} from "./utils/logger";

declare global {
  function NOP(): void
}
global.NOP = () => {};

Promise.resolve().then(async () => {
  await require("./plugs/httpOption").install();
  await require("./plugs/bot").install();
  
  await require("./plugs/botCOC").install();
  await require("./plugs/botCorpus").install();
  await require("./plugs/botEvents").install();
  await require("./plugs/botPixiv");
  await require("./plugs/botPlugin").install();
  await require("./plugs/botRepeat").install();
  await require("./plugs/botSauceNAOGroup").install();
  await require("./plugs/botSeTu");
  await require("./plugs/botTouHouPNG");
  await require("./plugs/test");
}).then(() => {
  logger.info("安装完成");
  module.children = [];
});
