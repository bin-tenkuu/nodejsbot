import {CQ, CQWebSocket} from "go-cqwebsocket";
import {GroupMessage, SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {CQTag} from "go-cqwebsocket/out/tags";
import {group} from "../config/corpus.json";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";

export = new class CQBotCorpus extends Plug {
  header?: Partial<SocketHandle>;
  corpus: {
    group: RegExp[],
    private: RegExp[],
  };
  
  constructor() {
    super(module);
    this.name = "语料库";
    this.description = "Bot 语料库,支持私聊/群聊/合并转发";
    this.version = 0.1;
    
    this.corpus = {
      group: [],
      private: [],
    };
  }
  
  async install() {
    let bot: CQWebSocket = require("./bot").bot;
    this.header = bot.bind("on", {
      "message.group": (event, message: GroupMessage, tags) => {
        let len = group.length;
        let text = message.raw_message.replace(/\[[^\]]+]/g, "").trim();
        for (let i = 0; i < len; i++) {
          let element = this.corpus.group[i];
          let item = group[i] as Group;
          if (element === undefined) element = this.corpus.group[i] = new RegExp(item.regexp);
          if (!element.test(text)) { continue; }
          event.stopPropagation();
          if (item.reply !== undefined) {
            CQBotCorpus.parseGroup(item.reply, message).then(tags => {
              bot.send_group_msg(message.group_id, tags).catch(() => {});
            }).catch(() => {
              logger.warn(`语料库转换失败:corpus.group[${i}]:${item.regexp}`);
            });
            return;
          }
          if (item.forward !== undefined) {
            tags.length;
            return;
          }
          return;
        }
      },
    });
  }
  
  async uninstall() {
    logger.info(this.toString());
  }
  
  private static async parseGroup(strings: string[], message: GroupMessage): Promise<CQTag<any>[]> {
    return strings.map<CQTag<any>>(str => {
      if (!str.startsWith("[")) return CQ.text(str);
      switch (str) {
        case "[at]":
          return CQ.at(message.user_id);
        case "[reply]":
          return CQ.reply(message.message_id);
        default:
          logger.info(`未支持的 JSON Tag:${str}`);
          return CQ.text(str);
      }
    });
  }
}
type Group = { regexp: string, reply?: string[], forward?: string[][] }
