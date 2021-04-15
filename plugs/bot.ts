import {CQ, CQWebSocket} from "go-cqwebsocket";
import {message} from "go-cqwebsocket/out/Interfaces";
import {adminId, CQWS} from "../config/config.json";
import {Plug} from "../Plug";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {GroupEvent, PrivateEvent} from "../utils/Util";

type GroFunList = ((this: void, event: GroupEvent) => void);
type PriFunList = ((this: void, event: PrivateEvent) => void);
export = new class CQBot extends Plug {
  public bot: CQWebSocket;
  private readonly grouper: Map<Plug, GroFunList[]>;
  private readonly privater: Map<Plug, PriFunList[]>;
  private readonly helper: Map<string, message>;
  
  constructor() {
    super(module, "Bot");
    this.name = "QQ机器人";
    this.description = "用于连接gocq-http服务的bot";
    this.version = 0;
    this.bot = new CQWebSocket(CQWS);
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
    this.grouper = new Map();
    this.privater = new Map();
    this.helper = new Map();
    this.bot.bind("on", {
      "message.group": (event, context, tags) => {
        let contextEvent = new GroupEvent(this.bot, context, tags, event);
        let userId = context.user_id;
        db.start(async db => {
          let newVar = await db.get("select id, exp from Members where id=?;", userId);
          if (newVar === undefined) {
            await db.run("insert into Members(id, exp, time) values (?, 1, ?)", userId, Date.now());
          } else {
            await db.run("update Members set exp=exp + 1, time=? where id = ?", Date.now(), userId);
          }
        });
        let values = this.grouper.values();
        let next = values.next();
        while (!next.done) {
          for (let fun of next.value) {
            fun(contextEvent);
            if (event.isCanceled) return;
          }
          next = values.next();
        }
        // console.log(contextEvent.isAtMe, event.isCanceled);
        if (!contextEvent.isAtMe) return;
        event.stopPropagation();
        let {
          group_id,
          message_id,
        } = context;
        let cqTags = contextEvent.text.replace(/吗/g, "")
            .replace(/不/g, "很")
            .replace(/你/g, "我")
            .replace(/(?<!没)有/g, "没有")
            .replace(/[？?]/g, "!");
        this.bot.send_group_msg(group_id, [
          CQ.reply(message_id),
          CQ.at(userId),
          CQ.text(cqTags),
        ]).catch(() => {});
        return;
      },
      "message.private": (event, context, tags) => {
        let contextEvent = new PrivateEvent(this.bot, context, tags, event);
        let values = this.privater.values();
        let next = values.next();
        while (!next.done) {
          for (let fun of next.value) {
            fun(contextEvent);
            if (event.isCanceled) return;
          }
          next = values.next();
        }
        // console.log(contextEvent.isAtMe, event.isCanceled);
        event.stopPropagation();
        this.bot.send_private_msg(context.user_id, `收到消息,但未命中处理`).catch(() => {});
        return;
      },
    });
  }
  
  setGroupHelper(name: string, node: message): void {
    this.helper.set(name, node);
  }
  
  delGroupHelper(name: string): void {
    this.helper.delete(name);
  }
  
  getGroup(plug: Plug): GroFunList[] {
    let r = this.grouper.get(plug);
    if (r === undefined) {
      r = [];
      this.grouper.set(plug, r);
    }
    return r;
  }
  
  delGroup(plug: Plug): void {
    this.grouper.delete(plug);
  }
  
  getPrivate(plug: Plug): PriFunList[] {
    let r = this.privater.get(plug);
    if (r === undefined) {
      r = [];
      this.privater.set(plug, r);
    }
    return r;
  }
  
  delPrivate(plug: Plug): void {
    this.privater.set(plug, []);
  }
  
  async install() {
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
};