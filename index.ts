import {logger} from "./utils/logger";

Promise.resolve().then(async () => {
  await require("./plugs/httpOption").default.install();
  await require("./plugs/bot").default.install();
  await require("./plugs/botPrivate").default.install();
  await require("./plugs/botGroup").default.install();
  
  await require("./plugs/botAntiXML").default;
  await require("./plugs/botCOC").default.install();
  await require("./plugs/botCorpus").default.install();
  await require("./plugs/botEvents").default.install();
  await require("./plugs/botFangCheHui").default;
  await require("./plugs/botGroupEvent").default.install();
  await require("./plugs/botGroupSender").default;
  await require("./plugs/botPixiv").default.install();
  await require("./plugs/botPlugin").default.install();
  await require("./plugs/botPrivate").default.install();
  await require("./plugs/botRepeat").default.install();
  await require("./plugs/botSauceNAOGroup").default.install();
  await require("./plugs/botSeTu").default.install();
  await require("./plugs/botTouHouPNG").default;
  await require("./plugs/test").default;
}).then(() => {
  logger.info("安装完成");
  module.children = [];
});
