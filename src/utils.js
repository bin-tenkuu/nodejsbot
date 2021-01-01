const http = require("http");
const {CQWebSocket, CQWebSocketOption, APIResponse, CQRequestOptions} = require("cq-websocket");


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
 * 简易的开启本地服务器结束进程
 * @param {function():Promise<*>|function():PromiseLike<*>} call 结束前需要调用的方法
 * @return {Server}
 */
function httpStop(call) {
  let server = http.createServer((req, res) => {
    res.setHeader("Content-type", "text/html; charset=utf-8");
    if (req.url === '/exit') {
      res.end("已关闭");
      call().then(() => {
        server.close();
        delayExit();
      });
    } else {
      res.end();
    }
  }).listen(40000);
  console.log("快速结束已启动,点击 http://127.0.0.1:40000/exit 结束进程");
  return server;
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


module.exports = {
  now,
  delayExit,
  httpStop,
  openCQWebSocket,
}