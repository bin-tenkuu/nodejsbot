import {CQWebSocket} from "go-cqwebsocket";
import {adminId, cqws} from "../configs/config";
import Plug from "../Plug";
import {logger} from "../utils/logger";

class CQBot extends Plug {
  public bot: CQWebSocket;
  
  constructor() {
    super(module, "Bot");
    this.name = "QQ机器人";
    this.description = "用于连接gocq-http服务的bot";
    this.version = 0;
    this.bot = new CQWebSocket(cqws);
    this.bot.bind("on", {
      "socket.error": (_, code, err) => {
        logger.warn(`连接错误[${code}]: ${err}`);
      },
      "socket.open": (_, type) => {
        logger.info(`连接开启 ${type}`);
      },
      "socket.close": (_, code, desc, type) => {
        logger.info(`已关闭 ${type}[${code}]: ${desc}`);
      },
    });
    this.bot.messageSuccess = (ret, message) => {
      logger.debug(`${message.action}成功：${JSON.stringify(ret.data)}`);
    };
    this.bot.messageFail = (reason, message) => {
      logger.error(`${message.action}失败[${reason.retcode}]:${reason.wording}`);
    };
  }
  
  install() {
    return new Promise<void>((resolve, reject) => {
      let first = true;
      let twice = this.bot.bind("on", {
        "socket.open": () => {
          if (first) {
            logger.info("连接1次");
            first = false;
            return;
          }
          logger.info("连接2次");
          resolve();
          this.bot.send_private_msg(2938137849, "已上线").catch(() => {});
          this.bot.unbind(twice);
        },
        "socket.close": () => reject(),
      });
      this.bot.connect();
      process.on("exit", () => {
        this.bot.disconnect();
      });
    });
  }
  
  async uninstall() {
    await this.bot.send_private_msg(adminId, "即将下线").catch(() => {});
    return new Promise<void>((resolve, reject) => {
      {
        let first = true;
        let close = (fun: Function) => {
          if (first) {
            logger.info("断开1次");
            first = false;
            return;
          }
          logger.info("断开2次");
          fun();
        };
        this.bot.bind("on", {
          "socket.close": () => {
            close(resolve);
          },
          "socket.error": () => {
            close(reject);
          },
        });
      }
      this.bot.disconnect();
    });
  }
}

export = new CQBot();