const {CQWebSocket, CQWebSocketOption, APIResponse, CQRequestOptions} = require("cq-websocket");
const {adminId} = require("../config/config.json");


/**
 * 返回当前时间
 * @returns {string} 当前时间
 */
function now() {
  return new Date().toLocaleString();
}

/**
 * 延时结束进程
 * @param {number?} time=2000 延时时间/ms,默认1秒
 * @return {number} 延时id
 */
function delayExit(time) {
  return setTimeout(() => {
    process.exit();
  }, time || 2000);
}


/**
 * 通过参数新建CQ实例
 * @param {Partial<CQWebSocketOption>}opt
 * @return {CQWebSocket}
 */
function openCQWebSocket(opt) {
  /**
   * @type {CQWebSocket}
   */
  let bot = new CQWebSocket(opt);
  bot.on("socket.connecting", (type, attempts) => {
    console.log(`${now()} 连接中[${type}]#${attempts}`);
  });
  bot.on("socket.failed", (type, attempts) => {
    console.log(`${now()} 连接失败[${type}]#${attempts}`);
  });
  bot.on("socket.error", (type, err) => {
    console.log(`${now()} 连接错误[${type}]`);
    console.log(err);
  });
  bot.on("socket.closing", type => {
    console.log(`${now()} 关闭中[${type}]`);
  });
  bot.on("socket.connect", (type, socket, attempts) => {
    console.log(`${now()} 已连接: ${type} #${attempts}`)
  });
  bot.on("socket.close", (type, code, desc) => {
    console.log(`${now()} 已关闭: ${type} (${code})#${desc}`)
  });
  /**
   * 发送方法,免的黄线
   * @param {string}method
   * @param {Record<string, any>?}params
   * @param {number|CQRequestOptions?}options
   * @return {Promise<APIResponse<any>>}
   */
  bot.send = (method, params, options) => bot.__call__(method, params, options)


  return bot;
}

function admin(message, user_id = adminId) {
  return {
    user_id: user_id,
    message: message
  }
}

function success(ret) {
  console.log(`${now()} 发送成功`, ret.data);
}

function fail(reason) {
  console.log(`${now()} 发送失败`, reason);
}


module.exports = {
  now,
  delayExit,
  openCQWebSocket,
  admin,
  success,
  fail,
}