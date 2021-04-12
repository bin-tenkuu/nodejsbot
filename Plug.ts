import * as fs from "fs";
import {logger} from "./utils/logger";

enum State {
  create,
  installed,
  uninstalled,
  error
}

export abstract class Plug {
  public static readonly plugs: { [key: string]: Plug } = {};
  public readonly module: NodeModule;
  public name: string;
  public description: string;
  public version: number;
  protected declare readonly __proto__: this;
  private _state: State;
  public error?: any;
  
  protected constructor(module: NodeModule, key?: string) {
    this._state = State.create;
    key = key ?? this.constructor.name;
    this.module = module;
    Plug.plugs[key] = this;
    this.name = key;
    this.description = "这个插件没有描述";
    this.version = -1;
    this.install = async function () {
      try {
        if (this._state === State.error) return;
        if (this._state === State.installed) return;
        await this.__proto__.install.call(this);
        logger.info("已启动 %s", this.toString());
        this._state = State.installed;
      } catch (e) {
        this._state = State.error;
        this.error = e;
      } finally {
        this.module.children = [];
      }
    };
    this.uninstall = async function () {
      try {
        if (this._state === State.uninstalled) return;
        await this.__proto__.uninstall.call(this);
        logger.info("已停止 %s", this.toString());
        if (this._state === State.error) return;
        this._state = State.uninstalled;
      } catch (e) {
        this._state = State.error;
        this.error = e;
      } finally {
        this.module.children = [];
      }
    };
    this._state = State.uninstalled;
    logger.debug("fix:\t" + this.module.filename);
  }
  
  abstract install(): Promise<void>
  
  abstract uninstall(): Promise<void>
  
  upgradeSelf(): this {
    Reflect.deleteProperty(require.cache, this.module.id);
    return require(this.module.id);
  }
  
  toString() {
    return `{name: ${this.name}, version: ${this.version}}\t-> ${this.constructor.name}`;
  }
  
  get installed() {
    return this._state === State.installed;
  }
  
  public get state(): string {
    return State[this._state];
  }
  
  toJSON() {
    return {"name": this.name, "version": this.version, "State": this.state};
  }
}

export var PlugLoader = new class PlugLoader extends Plug {
  
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
};