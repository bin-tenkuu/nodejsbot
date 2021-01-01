let Plugin = require("../Plugin");
const utils = require('../src/utils');
const {cqws, adminId} = require("../config/config.json");

function admin(message) {
  return {
    user_id: adminId,
    message: message
  }
}

function success(ret) {
  console.log(`${utils.now()} 发送成功`, ret.data);
}

function fail(reason) {
  console.log(`${utils.now()} 发送失败`, reason);
}


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
      global.bot = this;
      this.header = utils.openCQWebSocket(cqws);
      this.header.on("socket.connect", (type) => {
        if (type === "/api") {
          this.header.send("send_private_msg", admin("已上线")).then(success, fail);
        }
      });
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
      this.header.send('send_private_msg', admin("即将下线")).then(success, fail).then(() => {
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

  // upgrade(_this) {
  //   return super.upgrade(_this).then(()=>{
  //   });
  // }
}

module.exports = CQBot;