const CQ = require('cq-websocket');
const CQTag = CQ.CQAt.__proto__;

class CQReply extends CQTag {
  constructor(id) {
    super('reply', {id})
  }

  get id() {
    return this.data.id;
  }

  coerce() {
    this.data.id = Number(this.data.id)
    return this
  }
}

/**
 * 暴露的api
 */
{
  /**
   * 转义
   *
   * @param {string} str 欲转义的字符串
   * @param {boolean?} [insideCQ=false] 是否在CQ码内
   * @returns {string}转义后的字符串
   */
  function escape(str, insideCQ = false) {
    let temp = str.replace(/&/g, '&amp;')
        .replace(/\[/g, '&#91;')
        .replace(/]/g, '&#93;');
    if (insideCQ) {
      temp = temp
          .replace(/,/g, '&#44;')
          .replace(/(\ud83c[\udf00-\udfff])|(\ud83d[\udc00-\ude4f\ude80-\udeff])|[\u2600-\u2B55]/g, ' ');
    }
    return temp;
  }

  /**
   * 反转义
   *
   * @param {with} str 欲反转义的字符串
   * @returns {with}反转义后的字符串
   */
  function unescape(str) {
    return str.replace(/&#44;/g, ',').replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&amp;/g, '&');
  }

  /**
   * 回复消息
   * @param {number}id 消息ID
   * @return {CQTag}
   */
  function reply(id) {
    return new CQReply(id);
  }

  /**
   * 文本消息
   *
   * @param {string}text 文本
   * @return {CQTag}
   */
  function text(text) {
    return new CQ.CQText(escape(text, true));
  }

  /**
   * at消息
   * @param {number} qq 要at的人的qq
   * @return {CQTag}
   */
  function at(qq) {
    return new CQ.CQAt(qq);
  }

  /**
   * 图片消息
   * @param {string}file 图片路径，可以为网络
   * @return {CQTag}
   */
  function image(file) {
    return new CQ.CQImage(file)
  }

  /**
   * 消息组转字符串
   * @param {CQTag} CQTags 消息段
   */
  function toString(...CQTags) {
    return CQTags.join("");
  }


}

module.exports = {
  escape,
  unescape,
  reply,
  text,
  at,
  image,
  with: toString,
}