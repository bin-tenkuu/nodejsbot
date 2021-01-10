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

  async install() {
    await super.install()
    /**
     * @type {CQWebSocket}
     */
    this.header = utils.openCQWebSocket(cqws);
    global.bot = this.header;
    return new Promise((resolve, reject) => {
      let res = evt => {
        this.header.off("socket.error", rej)
        resolve(evt);
      }
      let rej = evt => {
        this.header.off("socket.error", res)
        reject(evt);
      }

      this.header.once("socket.open", res)
      // this.header.on("socket.open", () => {
      //   console.log("已上线")
      //   // this.header.send("send_private_msg", this.admin("已上线")).then(this.success, this.fail);
      // });
      this.header.once("socket.error", rej);
      this.header.connect();
    });
  }

  async uninstall() {
    await super.uninstall()
    global.bot = undefined;
    delete global.bot;
    await this.header.send('send_private_msg', this.admin("即将下线")).then(this.success, this.fail)
    return new Promise((resolve, reject) => {
      this.header.disconnect();
      this.header.once("socket.close", (evt) => resolve(evt));
      this.header.once("socket.error", (evt) => reject(evt));
      setTimeout(() => reject("timeout"), 5000);
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