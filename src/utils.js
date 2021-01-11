const {adminId} = require("../config/config.json");
const {CQWebSocket} = require("./websocket");


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
 * @param {*}opt
 * @return {CQWebSocket}
 */
function openCQWebSocket(opt) {
  /**
   * @type {CQWebSocket}
   */
  let bot = new CQWebSocket(opt);
  bot.on("socket.error", (evt, code, err) => {
    console.warn(`${now()} 连接错误[${code}]: ${err}`);
  });
  bot.on("socket.open", () => {
    console.log(`${now()} 连接开启`);
  });
  bot.on("socket.close", (evt, code, desc) => {
    console.log(`${now()} 已关闭[${code}]: ${desc}`)
  });
  bot.messageSuccess = ret => success(ret);
  bot.messageFail = reason => fail(reason);
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