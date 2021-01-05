class Plugin {
  /**
   * 构造函数<br/>
   * - `id` : 唯一标识id,默认类名
   * - `name` : 插件名称,默认为 `id`
   * - `description` : 描述,默认为""
   * - `version` : 版本号,默认为 `0`
   * @param {{
   * id:string,
   * name:string,
   * description:string,
   * version:number,
   * require:string[]
   * }|*} json 必要参数,即使不写也会有默认参数
   * @param {*?} header 可选参数,不写那就没
   */
  constructor(json, header) {
    let {
      id = this.constructor.name,
      name = id,
      description = "",
      version = 0,
      require = []
    } = json;
    /**
     * 插件ID
     * @type {string}
     */
    this.id = id;
    /**
     * 插件名字
     * @type {string}
     */
    this.name = name;
    /**
     * 插件描述
     * @type {string}
     */
    this.description = description;
    /**
     * 插件版本
     * @type {number}
     */
    this.version = version;
    /**
     * 前置插件IDs
     * @type {string[]}
     */
    this.require = require;
    /**
     * @type {*}
     */
    this.header = header;
    this._state = "created";
  }

  /**
   * 安装方法
   * @return {Promise<*>|PromiseLike<*>}默认返回参数为`this`
   */
  install() {
    this._state = "installed"
    return Promise.resolve(this)
  }

  /**
   * 卸载方法<br/>
   * **注:**如非特殊情况,本方法禁止抛出异常
   * @return {Promise<*>|PromiseLike<*>} 默认返回参数为`this`
   */
  uninstall() {
    this._state = this._state === "error" ? this._state : "uninstalled";
    return Promise.resolve(this)
  }

  /**
   * 是否已创建
   * @return {boolean}
   */
  get created() {
    return this._state === "created";
  }

  /**
   * 是否已安装
   * @return {boolean}
   */
  get installed() {
    return this._state === "installed";
  }

  /**
   * 是否已卸载
   * @return {boolean}
   */
  get uninstalled() {
    return this._state === "uninstalled";
  }

  /**
   * 设置错误
   * @param {*}error
   */
  set error(error) {
    this._state = "error";
    this._error = error
  }

  /**
   * 有错误时,返回错误,否则返回 `null`
   * @return {*}
   */
  get error() {
    return this._state === "error" ? this._error : null;
  }

  /**
   * 插件升级方法,从老版本更新至新版本时会调用此函数,并传入老版本的对象
   *
   * **注**:有升级时将会先运行此方法,然后进行install
   * @param {Plugin} _this 老版本对象
   * @return {Promise<*>}
   */
  upgrade(_this) {
    return Promise.resolve(_this)
  }

  toString() {
    return `${this.constructor.name} { id: ${this.id}, name: ${this.name}, version: ${this.version}}`
  }

  toJSON() {
    return {id: this.id, name: this.name, version: this.version, installed: this.installed};
  }
}


module.exports = Plugin;