import {CQ, CQEvent, CQWebSocket} from "go-cqwebsocket";
import {Status} from "go-cqwebsocket/out/Interfaces";
import {adminGroup, adminId, CQWS} from "../config/config.json";
import {groupMSG, privateMSG} from "../config/corpus.json";
import {Plug} from "../Plug";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {
  deleteMsg, isAdminQQ, isAtMe, onlyText, parseMessage, sendForward, sendForwardQuick, sendGroup, sendPrivate,
} from "../utils/Util";

type GroFunList = ((this: void, event: CQEvent<"message.group">) => void);
type Group = { regexp: RegExp, reply: string, forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number }
type Private = { regex: RegExp, reply: string, needAdmin: boolean, isOpen: boolean }

class CQBot extends Plug {
  public bot: CQWebSocket;
  private readonly grouper: Map<Plug, GroFunList[]>;
  private sendStateInterval?: NodeJS.Timeout;
  
  private banSet: Set<number>;
  readonly corpusPrivate: Private[];
  readonly corpusGroup: Group[];
  
  constructor() {
    super(module);
    this.name = "QQ机器人";
    this.description = "用于连接go-cqhttp服务的bot";
    this.version = 0;
    this.bot = new CQWebSocket(CQWS);
    this.bot.bind("on", {
      "socket.error": ({context}) => {
        logger.warn(`连接错误[${context.code}]: ${context.reason}`);
      },
      "socket.open": () => {
        logger.info(`连接开启`);
      },
      "socket.close": ({context}) => {
        logger.info(`已关闭 [${context.code}]: ${context.reason}`);
      },
    });
    this.bot.messageSuccess = (ret, message) => {
      logger.debug(`${message.action}成功：${JSON.stringify(ret.data)}`);
    };
    this.bot.messageFail = (reason, message) => {
      logger.error(`${message.action}失败[${reason.retcode}]:${reason.wording}`);
    };
    this.grouper = new Map();
    this.corpusPrivate = privateMSG.map(msg => ({
      regex: new RegExp(msg.regexp),
      reply: msg.reply ?? "",
      needAdmin: msg.needAdmin === true,
      isOpen: msg.isOpen !== false,
    }));
    this.corpusGroup = groupMSG.map(msg => ({
      regexp: new RegExp(msg.regexp),
      reply: msg.reply ?? "",
      forward: msg.forward === true,
      needAdmin: msg.needAdmin === true,
      isOpen: msg.isOpen !== false,
      delMSG: msg.delMSG ?? 0,
    }));
    this.banSet = new Set<number>();
    this.init();
  }
  
  sendState(state: Status["stat"]) {
    this.bot.send_group_msg(adminGroup, `数据包丢失总数:${state.packet_lost
    }\n接受信息总数:${state.message_received}\n发送信息总数:${state.message_sent}`).catch(() => {
      if (this.sendStateInterval !== undefined) {
        clearInterval(this.sendStateInterval);
      }
    });
  }
  
  private async privateMessage(event: CQEvent<"message.private">) {
    let text = onlyText(event);
    let isAdmin = isAdminQQ(event);
    for (const element of this.corpusPrivate) {
      if (!element.isOpen) continue;
      if (element.needAdmin && !isAdmin) continue;
      let exec = element.regex.exec(text);
      if (exec === null) continue;
      if (event.isCanceled) return;
      await parseMessage(element.reply, event, exec).then(tags => {
        if (tags.length > 0) sendPrivate(event, tags);
      }).catch(e => {
        logger.error("语料库转换失败:" + element.reply.toString());
        console.error(e);
      });
      if (event.isCanceled) return;
    }
  }
  
  private async groupMessage(event: CQEvent<"message.group">) {
    let userId = event.context.user_id;
    db.start(async db => {
      await db.run("insert or ignore into Members(id, time) values (?, ?);", userId, Date.now());
      await db.run("update Members set exp=exp + 1, time=? where id = ?;", Date.now(), userId);
      await db.close();
    }).catch(NOP);
    if (this.banSet.has(userId)) { return; }
    let text = onlyText(event);
    let isAdmin = isAdminQQ(event);
    for (const element of this.corpusGroup) {
      if (!element.isOpen) { continue; }
      if (element.needAdmin && !isAdmin) {continue;}
      let exec = element.regexp.exec(text);
      if (exec === null) {continue;}
      if (event.isCanceled) return;
      await parseMessage(element.reply, event, exec).then(tags => {
        if (tags.length < 1) return;
        if (element.forward) {
          if (tags[0].tagName === "node") {
            sendForward(event, tags).catch(NOP);
          } else {
            sendForwardQuick(event, [tags]).catch(NOP);
          }
        } else {
          sendGroup(event, tags, element.delMSG > 0 ? (id) => {
            deleteMsg(event, id.message_id, element.delMSG);
          } : undefined);
        }
      }).catch(e => {
        logger.warn(`群聊语料库转换失败:` + element.regexp);
        console.error(e);
      });
      if (event.isCanceled) return;
    }
    // console.log(contextEvent.isAtMe, event.isCanceled);
    if (!isAtMe(event)) return;
    event.stopPropagation();
    let {group_id, message_id} = event.context;
    let cqTags = onlyText(event).replace(/吗/g, "")
        .replace(/不/g, "很")
        .replace(/你/g, "我")
        .replace(/(?<!没)有/g, "没有")
        .replace(/[？?]/g, "!");
    this.bot.send_group_msg(group_id, [
      CQ.reply(message_id),
      CQ.at(userId),
      CQ.text(cqTags),
    ]).catch(NOP);
    return;
    
  }
  
  async install() {
    return new Promise<void>((resolve, reject) => {
      this.bot.bind("onceAll", {
        "socket.open": (event) => {
          logger.info("连接");
          event.bot.send_private_msg(2938137849, "已上线").catch(NOP);
          resolve();
          this.sendStateInterval = setInterval(() => {
            this.sendState(this.bot.state.stat);
          }, 1000 * 60 * 60 * 2);
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
    await this.bot.send_private_msg(adminId, "即将下线").catch(NOP);
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
  
  init() {
    this.bot.bind("on", {
      "message.group": (event) => {
        this.groupMessage(event);
      },
      "message.private": (event) => {
        this.privateMessage(event).catch(NOP);
      },
    });
    db.start(async db => {
      let all = await db.all<{ id: number }[]>(`select id from Members where baned = 1`);
      this.banSet = new Set(all.map(v => v.id));
      await db.close();
    }).catch(NOP);
  }
}

export = new CQBot();