import fs from "fs";
import Plug from "./Plug";
import {logger} from "./utils/logger";

class PlugLoader extends Plug {
  
  constructor() {
    super(module, "PluginLoader");
    this.name = "插件加载器";
    this.description = "专门用于加载插件的插件";
    this.version = 1;
  }
  
  async install(): Promise<void> {
    logger.info("开始加载插件列表");
    let plugPath = `./plugs`;
    let files = fs.readdirSync("./src/plugs", {
      encoding: "utf-8",
    });
    for (let file of files) {
      let filePath = `${plugPath}/${file}`;
      let plug = require(filePath);
      if (plug instanceof Plug) {
        logger.info("fix: ", filePath);
        continue;
      }
      logger.error("error: ", filePath);
    }
    module.children = [];
  }
  
  async uninstall(): Promise<void> {
  }
}

export default new PlugLoader().install();