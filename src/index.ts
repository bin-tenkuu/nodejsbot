import PlugLoader from "./PlugLoader";


PlugLoader.install().then(async () => {
  await require("./plugs/httpOption").install();
  await require("./plugs/bot").install();
  await require("./plugs/botPrivate").install();
  await require("./plugs/botGroup").install();
  
  await require("./plugs/botPlugin").install();
  
  await require("./plugs/botSeTu").install();
  // await require("./plugs/botPixiv").install();
  
}).then(() => {
  module.children = [];
});
