import PlugLoader from "./PlugLoader";


PlugLoader.install().then(() => {
  return require("./plugs/httpOption").default.install();
}).then(() => {
  return require("./plugs/bot").default.install();
}).then(() => {
  return require("./plugs/botPlugin").default.install();
}).then(() => {
  module.children = [];
});


