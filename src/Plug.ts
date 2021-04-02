import {logger} from "./utils/logger";

enum State {
  create,
  installed,
  uninstalled,
  error
}

export default abstract class Plug {
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
  }
  
  abstract install(): Promise<void>
  
  abstract uninstall(): Promise<void>
  
  upgradeSelf(): this {
    delete require.cache[this.module.id];
    return require(this.module.id);
  }
  
  toString() {
    return `${this.constructor.name} {name: ${this.name}, version: ${this.version}}`;
  }
  
  get installed() {
    return this._state === State.installed;
  }
  
  toJSON() {
    return {"name": this.name, "version": this.version, "State": State[this._state]};
  }
}