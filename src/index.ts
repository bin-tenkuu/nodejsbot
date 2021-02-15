import PlugLoader from "./PlugLoader";


PlugLoader.install().then(() => {
  return require("./plugs/httpOption").install();
}).then(() => {
  return require("./plugs/bot").install();
}).then(() => {
  return require("./plugs/botCOC").install();
}).then(() => {
  module.children = [];
});



