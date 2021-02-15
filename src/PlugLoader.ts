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
    let plugPath = `${module.path}/plugs`;
    let dir = fs.opendirSync("./out/plugs", {
      encoding: "utf-8",
      bufferSize: 8,
    });
    let dirent: fs.Dirent | null;
    while (dirent = dir.readSync()) {
      if (!dirent.isFile()) { continue; }
      let filePath = `${plugPath}/${dirent.name}`;
      console.info(filePath);
      let plug = require(filePath);
      if (plug instanceof Plug) {
        console.info(plug.toString());
        continue;
      }
      console.error(filePath);
    }
    module.children = [];
    return dir.close();
  }
  
  async uninstall(): Promise<void> {
  }
}

export = new PlugLoader();