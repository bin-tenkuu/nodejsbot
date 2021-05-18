import {readdirSync} from "fs";
import {logger} from "./utils/logger";

enum State {
  create,
  installed,
  uninstalled,
  error
}

export abstract class Plug {
  public static readonly plugs: Map<string, Plug> = new Map<string, Plug>();
  public readonly module: NodeModule;
  public name: string;
  public description: string;
  public version: number;
  public error?: any;
  // public canAutoCall: Set<keyof ThisType<this>>;
  protected declare readonly __proto__: Readonly<this>;
  
  #state: State;
  
  protected constructor(module: NodeModule) {
    logger.debug("fix:\t" + module.filename);
    this.#state = State.create;
    let key = this.constructor.name;
    this.module = module;
    Plug.plugs.set(key, this);
    this.name = key;
    this.description = "这个插件没有描述";
    this.version = -1;
    this.#state = State.uninstalled;
    this.install = async function () {
      try {
        if (this.#state === State.error) return;
        if (this.#state === State.installed) return;
        await this.__proto__.install.call(this);
        logger.info("已启动 %s", this.toString());
        this.#state = State.installed;
      } catch (e) {
        this.#state = State.error;
        this.error = e;
      } finally {
        this.module.children = [];
      }
    };
    this.uninstall = async function () {
      try {
        if (this.#state === State.uninstalled) return;
        await this.__proto__.uninstall.call(this);
        logger.info("已停止 %s", this.toString());
        if (this.#state === State.error) return;
        this.#state = State.uninstalled;
      } catch (e) {
        this.#state = State.error;
        this.error = e;
      } finally {
        this.module.children = [];
      }
    };
  }
  
  public async install(): Promise<void> {}
  
  public async uninstall(): Promise<void> {}
  
  public toString() {
    return `{name: ${this.name}, version: ${this.version}}\t-> ${this.constructor.name}`;
  }
  
  public get installed() {
    return this.#state === State.installed;
  }
  
  public get state(): string {
    return State[this.#state];
  }
  
  public toJSON() {
    return {"name": this.name, "version": this.version, "State": this.state};
  }
}

export var PlugLoader = new class PlugLoader extends Plug {
  
  constructor() {
    super(module);
    this.name = "插件加载器";
    this.description = "专门用于加载插件的插件";
    this.version = 1;
  }
  
  async install(): Promise<void> {
    logger.info("开始加载插件列表");
    let plugPath = `./plugs`;
    let files = readdirSync("./src/plugs", {
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