const {
  CQTag,
  CQAnonymous,
  CQAt,
  CQBFace,
  CQCustomMusic,
  CQDice,
  CQEmoji,
  CQFace,
  CQImage,
  CQMusic,
  CQRecord,
  CQRPS,
  CQSFace,
  CQShake,
  CQShare,
  CQText,
  CQReply
} = require('./tags')

const CQ = {
  at: (qq) => new CQAt(qq),
  text: (text) => new CQText(text),
  reply: (text) => new CQReply(text),
  image: (file) => new CQImage(file)

}
const SPLIT = /[\[\]]/;
const CQ_TAG_REGEXP = /^CQ:([a-z]+)(,.+)*$/;


/**
 * @example `CQ:share,title=震惊&#44;小伙睡觉前居然...,url=http://baidu.com/?a=1&amp;b=2`
 * @param {string}tagStr
 */
function parseCQ(tagStr) {
  let tag;
  let match = tagStr.match(CQ_TAG_REGEXP);
  if (match[2]) {
    let data = {};
    match[2].split(",").forEach(str => {
      let [k, v] = str.split("=");
      data[k] = v;
    })
    tag = new CQTag(match[1], data);
  } else {
    tag = new CQTag(match[1]);
  }
  let proto;
  switch (match[1]) {
    case 'anonymous':
      proto = CQAnonymous.prototype
      break;
    case 'at':
      proto = CQAt.prototype
      break;
    case 'bface':
      proto = CQBFace.prototype
      break;
    case 'music':
      proto = tag.data.type === 'custom'
          ? CQCustomMusic.prototype : CQMusic.prototype
      break;
    case 'dice':
      proto = CQDice.prototype
      break;
    case 'emoji':
      proto = CQEmoji.prototype
      break;
    case 'face':
      proto = CQFace.prototype
      break;
    case 'image':
      proto = CQImage.prototype
      break;
    case 'record':
      proto = CQRecord.prototype
      break;
    case 'rps':
      proto = CQRPS.prototype
      break;
    case 'sface':
      proto = CQSFace.prototype
      break;
    case 'shake':
      proto = CQShake.prototype
      break;
    case 'share':
      proto = CQShare.prototype
      break;
    case 'text':
      proto = CQText.prototype
      break;
    case 'reply':
      proto = CQReply.prototype
      break;
    default:
      proto = CQTag.prototype;
      break;
  }
  return Object.setPrototypeOf(tag, proto).coerce()
}

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
 * @param {string} str 欲反转义的字符串
 * @returns {string}反转义后的字符串
 */
function unescape(str) {
  return str.replace(/&#44;/g, ',').replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&amp;/g, '&');
}

/**
 * r
 * @param {string}msg
 */
module.exports = {
  CQ,
  escape,
  unescape,
  parse: (msg) => {
    msg.split(SPLIT).map(str => {
      if (str === "") return null;
      if (CQ_TAG_REGEXP.test(str)) {
        return parseCQ(str)
      }
      return CQ.text(str)
    }).filter(v => v !== null)
  }
}