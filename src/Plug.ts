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
  private declare readonly __proto__: this;
  private _state: State;
  public error?: any;
  
  protected constructor(module: NodeModule, key?: string) {
    key = key ?? this.constructor.name;
    this.module = module;
    Plug.plugs[key] = this;
    this.name = key;
    this.description = "这个插件没有描述";
    this.version = -1;
    this._state = State.create;
    this.install = async () => {
      try {
        if (this._state === State.error) return;
        await this.__proto__.install();
        this._state = State.installed;
      } catch (e) {
        this._state = State.error;
        this.error = e;
      }
    };
    this.uninstall = async () => {
      try {
        await this.__proto__.uninstall();
        this.module.children = [];
        if (this._state === State.error) return;
        this._state = State.uninstalled;
      } catch (e) {
        this._state = State.error;
        this.error = e;
      }
    };
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
    return {
      name: this.name,
      version: this.version,
      installed: this._state === State.installed,
    };
  }
}