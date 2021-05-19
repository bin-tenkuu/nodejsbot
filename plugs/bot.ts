import {CQ, CQEvent, CQTag, CQWebSocket} from "go-cqwebsocket";
import {Status} from "go-cqwebsocket/out/Interfaces";
import {adminGroup, adminId, CQWS} from "../config/config.json";
import {groupMSG, privateMSG} from "../config/corpus.json";
import {Plug} from "../Plug";
import {canCallGroup} from "../utils/Annotation";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {
  deleteMsg, isAdminQQ, isAtMe, onlyText, parseMessage, sendForward, sendForwardQuick, sendGroup, sendPrivate,
} from "../utils/Util";

type Corpus = {
  name: string, regexp: RegExp, reply: string,
  forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number
}

class CQBot extends Plug {
  public bot: CQWebSocket;
  
  banSet: Set<number>;
  corpusPrivate: Corpus[];
  corpusGroup: Corpus[];
  
  private sendStateInterval?: NodeJS.Timeout;
  
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
    this.corpusPrivate = this.corpusGroup = [];
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
  
  private static* getValues(corpus1: Corpus[], corpus2?: Corpus[]): Generator<Corpus, void> {
    for (const corp of corpus1) {
      yield corp;
    }
    if (corpus2 === undefined) return;
    for (const corp of corpus2) {
      yield corp;
    }
  }
  
  private static exec(element: Corpus, text: string, isAdmin: boolean): RegExpExecArray | null {
    if (element.needAdmin && !isAdmin) return null;
    if (!element.isOpen) return null;
    return element.regexp.exec(text);
  }
  
  private static sendCorpusTags(event: CQEvent<"message.private"> | CQEvent<"message.group">,
      corpus: Iterable<Corpus>, callback: (this: void, tags: CQTag<any>[], element: Corpus) => void) {
    let text = onlyText(event);
    let isAdmin = isAdminQQ(event);
    for (const element of corpus) {
      let exec = CQBot.exec(element, text, isAdmin);
      if (exec === null) continue;
      if (event.isCanceled) return;
      parseMessage(element.reply, event, exec).catch(e => {
        logger.error("语料库转换失败:" + element.name);
        logger.error(e);
        return [CQ.text("error:" + element.name + "\n")];
      }).then(msg => {
        callback(msg, element);
      });
      if (event.isCanceled) return;
    }
    return;
  }
  
  @canCallGroup()
  async MemeAI(event: CQEvent<"message.group">, execArray: RegExpExecArray) {
    if (!isAtMe(event)) return [];
    event.stopPropagation();
    let {message_id, user_id} = event.context;
    let cqTags = execArray[0].replace(/吗/g, "")
        .replace(/不/g, "很")
        .replace(/你/g, "我")
        .replace(/(?<!没)有/g, "没有")
        .replace(/[？?]/g, "!");
    return [
      CQ.reply(message_id),
      CQ.at(user_id),
      CQ.text(cqTags),
    ];
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
    this.corpusPrivate = privateMSG.map(msg => ({
      name: msg.name ?? "",
      regexp: new RegExp(msg.regexp ?? "$^"),
      reply: msg.reply ?? "",
      forward: msg.forward === true,
      needAdmin: msg.needAdmin === true,
      isOpen: msg.isOpen !== false,
      delMSG: msg.delMSG ?? 0,
    }));
    this.corpusGroup = groupMSG.map(msg => ({
      name: msg.name ?? "",
      regexp: new RegExp(msg.regexp ?? "$^"),
      reply: msg.reply ?? "",
      forward: msg.forward === true,
      needAdmin: msg.needAdmin === true,
      isOpen: msg.isOpen !== false,
      delMSG: msg.delMSG ?? 0,
    }));
    this.bot.bind("on", {
      "message.group": (event) => {
        let hrtime = process.hrtime();
        let userId = event.context.user_id;
        db.start(async db => {
          await db.run("insert or ignore into Members(id, time) values (?, ?);", userId, Date.now());
          await db.run("update Members set exp=exp + 1, time=? where id = ?;", Date.now(), userId);
          await db.close();
        }).catch(NOP);
        if (this.banSet.has(userId)) { return; }
        CQBot.sendCorpusTags(event, CQBot.getValues(this.corpusPrivate, this.corpusGroup), (tags, element) => {
          if (tags.length < 1) return;
          logger.info(`本次请求耗时:${process.hrtime(hrtime)[1]}纳秒`);
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
        });
      },
      "message.private": (event) => {
        let hrtime = process.hrtime();
        CQBot.sendCorpusTags(event, this.corpusPrivate, tags => {
          if (tags.length < 1) return;
          logger.info(`本次请求耗时:${process.hrtime(hrtime)[1]}纳秒`);
          sendPrivate(event, tags);
        });
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