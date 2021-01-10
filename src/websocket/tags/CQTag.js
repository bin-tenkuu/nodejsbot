// const equal = require("deep-equal");

module.exports = class CQTag {
  /**
   *
   * @param {string} type tag类型
   * @param {object} data
   */
  constructor(type, data = null) {
    this.data = data
    this._type = type
    this._modifier = null
  }

  /**
   * @return {string}
   */
  get tagName() {
    return this._type
  }

  /**
   * 获取额外值
   * @return {*}
   */
  get modifier() {
    return this._modifier || {}
  }

  /**
   * 设置额外值
   * @param val
   */
  set modifier(val) {
    this._modifier = val
  }

  toJSON() {
    const data = {}

    for (let [k, v] of Object.entries(this.data || {})) {
      if (v !== undefined) {
        data[k] = String(v)
      }
    }

    for (let [k, v] of Object.entries(this.modifier)) {
      if (v !== undefined) {
        data[k] = String(v)
      }
    }

    return {
      type: this._type,
      data: Object.keys(data).length > 0 ? data : null
    }
  }

  valueOf() {
    return this.toString()
  }

  toString() {
    let ret = `[CQ:${this._type}`

    for (let [k, v] of Object.entries(this.data || {})) {
      if (v !== undefined) {
        ret += `,${k}=${v}`
      }
    }

    for (let [k, v] of Object.entries(this.modifier)) {
      if (v !== undefined) {
        ret += `,${k}=${v}`
      }
    }

    ret += ']'
    return ret
  }

  /**
   * @abstract
   * 强制将属性转换为对应类型
   */
  coerce() {
    return this
  }
}
