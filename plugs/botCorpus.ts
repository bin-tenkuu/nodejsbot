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
          if (item.reply === undefined || item.reply.length === 0) return;
          if (item.forward !== true) {
            CQBotCorpus.parseGroup(item.reply[0], message).then(tags => {
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
  
  private static async parseGroup(template: string, message: GroupMessage): Promise<CQTag<any>[]> {
    let split = this.split(template);
    let tags: CQTag<any>[] = [];
    for (let str of split) {
      if (!str.startsWith("[")) {
        tags.push(CQ.text(str));
        continue;
      }
      let exec = /^\[(?<head>CQ|FN):(?<body>[^\]]+)]$/.exec(str);
      if (exec === null) {
        tags.push(CQ.text(str));
        continue;
      }
      let {head, body} = exec.groups as { head: "CQ" | "FN", body: string };
      switch (head) {
        case "CQ":
          tags.push(this.parseCQ(body, message));
          continue;
        case "FN":
          tags.push(this.parseFN(body, message));
          continue;
        default:
          let never: never = head;
          tags.push(CQ.text(str));
          console.log(never);
      }
    }
    return tags;
  }
  
  private static parseCQ(str: string, message: GroupMessage): CQTag<any> {
    switch (str) {
      case "reply":
        return CQ.reply(message.message_id);
      case "at":
        return CQ.at(message.user_id);
      default:
        return CQ.text(str);
    }
  }
  
  private static parseFN(str: string, message: GroupMessage): CQTag<any> {
    return CQ.text(str);
  }
  
  private static split(str: string): string[] {
    return str.split(/(?<=])|(?=\[)/);
  }
}
type Group = { regexp: string, reply?: string[], forward?: boolean }
