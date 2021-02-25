import fs from "fs";
import Plug from "./Plug";

class PlugLoader extends Plug {
  
  constructor() {
    super(module, "PluginLoader");
    this.name = "插件加载器";
    this.description = "专门用于加载插件的插件";
    this.version = 1;
  }
  
  async install(): Promise<void> {
    console.info("开始加载插件列表");
    let plugPath = `./plugs`;
    let files = fs.readdirSync("./out/plugs", {
      encoding: "utf-8",
    });
    for (let file of files) {
      let filePath = `${plugPath}/${file}`;
      let plug = require(filePath);
      if (plug instanceof Plug) {
        console.info("fix: ", filePath);
        continue;
      }
      console.error("error: ", filePath);
    }
    module.children = [];
  }
  
  async uninstall(): Promise<void> {
  }
}

export = new PlugLoader();