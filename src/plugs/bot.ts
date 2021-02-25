import {CQWebSocket} from "go-cqwebsocket";
import {adminId, cqws} from "../configs/config";
import Plug from "../Plug";

class CQBot extends Plug {
  _bot?: CQWebSocket;
  
  constructor() {
    super(module, "Bot");
    this.name = "QQ机器人";
    this.description = "用于连接gocq-http服务的bot";
    this.version = 0;
  }
  
  install() {
    let bot = new CQWebSocket(cqws);
    this._bot = bot;
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
    bot.messageSuccess = (ret, message) => console.log(`${Date()} ${message.action}成功：${ret.data}`);
    bot.messageFail = (reason, message) => console.log(
        `${Date()} ${message.action}失败[${reason.retcode}]:${reason.wording}`, reason);
    {
      let first = true;
      let twice = (bot.bind("on", {
        "socket.open": () => {
          if (first) {
            console.log("连接1次");
            first = false;
            return;
          }
          console.log("连接2次");
          bot.send_private_msg(2938137849, "已上线").catch(() => {});
          bot.unbind(twice);
        },
      }));
    }
    return new Promise<void>((resolve, reject) => {
      bot.bind("onceAll", {
        "socket.open": () => resolve(),
        "socket.close": () => reject(),
      });
      bot.connect();
    });
  }
  
  async uninstall() {
    let bot = this.bot;
    await bot.send_private_msg(adminId, "即将下线").catch(() => {});
    return new Promise<void>((resolve, reject) => {
      {
        let first = true;
        let close = (fun: Function) => {
          if (first) {
            console.log("断开1次");
            first = false;
            return;
          }
          console.log("断开2次");
          fun();
        };
        bot.bind("on", {
          "socket.close": () => {
            close(resolve);
          },
          "socket.error": () => {
            close(reject);
          },
        });
      }
      bot.disconnect();
    });
  }
  
  get bot(): CQWebSocket {
    if (this._bot === undefined) {
      throw "haven't installed";
    }
    return this._bot;
  }
  
  switchRun(text: string, map: [RegExp, (this: void) => void][]): boolean {
    if (text == undefined) return false;
    let filter = map.filter((reg) => reg[0].test(text));
    if (filter.length <= 0) return false;
    filter.forEach(([, fun]) => fun());
    return true;
  }
}

export = new CQBot();