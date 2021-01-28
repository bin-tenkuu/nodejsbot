let Plugin = require("../Plugin");
const utils = require("../src/utils");
const {cqws, adminId} = require("../config/config.json");
const CQWebSocket = require("go-cqwebsocket").CQWebSocket;

class CQBot extends Plugin {
  constructor() {
    super({
      id: "CQBot",
      name: "QQ机器人",
      description: "用于连接gocq-http服务的bot",
      version: 0,
    });
  }

  async install() {
    await super.install();
  
    this.header = utils.openCQWebSocket(cqws);
    /**
     *
     * @type {CQWebSocket}
     */
    global.bot = this.header;
    return new Promise((resolve, reject) => {
      global.bot.bind("onceAll", {
        "socket.open": resolve,
        "socket.error": reject,
      });
      global.bot.connect();
    });
  }

  async uninstall() {
    await super.uninstall();
    global.bot = undefined;
    delete global.bot;
    await this.header.send_private_msg(adminId, "即将下线");
    return new Promise((resolve, reject) => {
      global.bot.bind("onceAll", {
        "socket.close": resolve,
        "socket.error": reject,
      });
      global.bot.disconnect();
// setTimeout(() => bot["socket.error"](null,null,"timeout"), 5000);
    });
  }

}

module.exports = CQBot;