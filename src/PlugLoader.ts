import Plug from "./Plug";

class PlugLoader extends Plug {
  
  constructor() {
    super(module, "PluginLoader");
    this.name = "插件加载器";
    this.description = "专门用于加载插件的插件";
    this.version = 1;
  }
  
  public install(): Promise<void> {
    return Promise.resolve(undefined);
  }
  
  public uninstall(): Promise<void> {
    return Promise.resolve(undefined);
  }
}

exports = new PlugLoader();