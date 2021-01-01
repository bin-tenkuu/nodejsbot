// const Plugin = require("./Plugin");
const PluginLoader = require("./PluginLoader");
const utils = require("./src/utils");

/**
 *
 * @type {PluginLoader}
 */
let loader = new PluginLoader();


loader.toggle(null, loader).then(() => {
  console.log(">>>>>>>>>> 启动 <<<<<<<<<<")
}).then(() => {
  return loader.refreshPlugin();
}).then(() => {
  console.log(`${utils.now()} `, loader.plugins);
  return loader.handle(true, "HttpOption", /*"CQBot"*/);
});

