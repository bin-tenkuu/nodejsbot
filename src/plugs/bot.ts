import {CQWebSocket} from "go-cqwebsocket";
import Plug from "../Plug";

const {cqws, adminId} = require("../../config/config.json");

class CQBot extends Plug {
  bot?: CQWebSocket;
  
  constructor() {
    super(module, "Bot");
    this.name = "QQ机器人";
    this.description = "用于连接gocq-http服务的bot";
    this.version = 0;
  }
  
  install() {
    let bot = new CQWebSocket(cqws);
    this.bot = bot;
    bot.bind("on", {
      "socket.error": (_, code, err) => {
        console.warn(`${Date()} 连接错误[${code}]: ${err}`);
      },
      "socket.open": (_, type) => {
        console.log(`${Date()} 连接开启 ${type}`);
      },
      "socket.close": (_, code, desc, type) => {
        console.log(`${Date()} 已关闭 ${type}[${code}]: ${desc}`);
      },
    });
    bot.messageSuccess = ret => console.log(`${Date()} 发送成功`, ret);
    bot.messageFail = reason => console.log(`${Date()} 发送失败`, reason);
    bot.once("socket.open", (event, message) => {
      let msg = bot.bind("onceAll", {
        "socket.open": () => {
          clearTimeout(timeout);
          bot.send_private_msg(2938137849, "已上线");
        },
      });
      let timeout = setTimeout(() => {
        return msg["socket.open"]?.(event, message);
      }, 5000);
    });
  
    return new Promise<void>((resolve, reject) => {
      bot.bind("onceAll", {
        "socket.open": () => resolve(),
        "socket.close": () => reject(),
      });
      bot.connect();
    });
  }
  
  async uninstall() {
    if (!this.bot) return;
    let bot = this.bot;
    await bot.send_private_msg(adminId, "即将下线")
      .then(bot.messageSuccess, bot.messageFail);
    return new Promise<void>((resolve, reject) => {
      bot.bind("onceAll", {
        "socket.close": () => resolve(),
        "socket.error": () => reject(),
      });
      bot.disconnect();
    });
  }
  
}

export default new CQBot();