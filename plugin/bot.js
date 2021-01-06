let Plugin = require("../Plugin");
const utils = require('../src/utils');
const {cqws, adminId} = require("../config/config.json");

class CQBot extends Plugin {
  constructor() {
    super({
      id: "CQBot",
      name: "QQ机器人",
      description: "用于连接gocq-http服务的bot",
      version: 0
    });
  }

  install() {
    return super.install().then(() => {
      this.header = utils.openCQWebSocket(cqws);
      this.header.on("socket.connect", (type) => {
        if (type === "/api") {
          this.header.send("send_private_msg", this.admin("已上线")).then(this.success, this.fail);
        }
      });
      global.bot = this.header;
      return new Promise((resolve, reject) => {
        this.header.once("socket.connect", () => resolve());
        this.header.once("socket.failed", (_, attempts) => reject(attempts));
        this.header.once("socket.error", (_, err) => reject(err));
        setTimeout(() => reject("timeout"), 5000);
        this.header.connect();
      });
    });
  }

  uninstall() {
    return super.uninstall().then(() => {
      global.bot = undefined;
      delete global.bot;
      this.header.send('send_private_msg', this.admin("即将下线")).then(this.success, this.fail).then(() => {
        this.header.disconnect();
      })
      return new Promise((resolve, reject) => {
        this.header.once("socket.close", () => resolve());
        this.header.once("socket.failed", (_, attempts) => reject(attempts));
        this.header.once("socket.error", (_, err) => reject(err));
        setTimeout(() => reject("timeout"), 5000);
      });
    });
  }

  admin(message, user_id = adminId) {
    return {
      user_id: user_id,
      message: message
    }
  }

  success(ret) {
    console.log(`${utils.now()} 发送成功`, ret.data);
  }

  fail(reason) {
    console.log(`${utils.now()} 发送失败`, reason);
  }
}

module.exports = CQBot;