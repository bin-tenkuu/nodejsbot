import {CQWebSocket} from "go-cqwebsocket";
import {adminId, CQws} from "../config/config.json";
import Plug from "../Plug";
import {logger} from "../utils/logger";

class CQBot extends Plug {
  public bot: CQWebSocket;
  
  constructor() {
    super(module, "Bot");
    this.name = "QQ机器人";
    this.description = "用于连接gocq-http服务的bot";
    this.version = 0;
    this.bot = new CQWebSocket(CQws);
    this.bot.bind("on", {
      "socket.error": (_, code, err) => {
        logger.warn(`连接错误[${code}]: ${err}`);
      },
      "socket.open": (_) => {
        logger.info(`连接开启`);
      },
      "socket.close": (_, code, desc) => {
        logger.info(`已关闭 [${code}]: ${desc}`);
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
      this.bot.bind("onceAll", {
        "socket.open": () => {
          logger.info("连接");
          this.bot.send_private_msg(2938137849, "已上线").catch(() => {});
          resolve();
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
      this.bot.bind("on", {
        "socket.close": () => {
          logger.info("断开");
          resolve();
        },
        "socket.error": () => {
          logger.info("断开");
          reject();
        },
      });
      this.bot.disconnect();
    });
  }
}

export = new CQBot();