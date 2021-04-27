import {CQ, CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {group} from "../config/corpus.json";
import {Plug} from "../Plug";
import {CanAutoCall} from "../utils/Annotation";
import {logger} from "../utils/logger";
import {onlyText, sendAuto, sendForward} from "../utils/Util";

export = new class CQBotCorpus extends Plug {
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
    require("./bot").getGroup(this).push((event: CQEvent<"message.group">) => {
      let len = group.length;
      let text = onlyText(event);
      let context = event.context;
      for (let i = 0; i < len; i++) {
        let element = this.corpus.group[i];
        let item = group[i] as Group;
        if (element === undefined) element = this.corpus.group[i] = new RegExp(item.regexp);
        if (!element.test(text)) { continue; }
        if (item.reply === undefined || item.reply.length === 0) return;
        event.stopPropagation();
        if (item.forward !== true) {
          CQBotCorpus.parseGroup(item.reply[0], event).then(tags => {
            sendAuto(event, tags);
          }).catch(() => {
            logger.warn(`语料库转换失败:corpus.group[${i}]:${item.regexp}`);
          });
          return;
        }
        Promise.all(item.reply.map(str => CQBotCorpus.parseGroup(str, event))).then(msg => {
          let {user_id, sender: {nickname}} = context;
          sendForward(event, msg.map(v => CQ.node(nickname, user_id, v))).catch(() => {});
        }).catch(() => {
          logger.warn(`语料库转换失败:corpus.group[${i}]:${item.regexp}`);
        });
        return;
      }
    });
  }
  
  async uninstall() {
    require("./bot").delGroup(this);
  }
  
  private static async parseGroup(template: string, message: CQEvent<"message.group">): Promise<CQTag<any>[]> {
    let split = this.split(template);
    let tags: CQTag<any>[] = [];
    for (let str of split) {
      if (!str.startsWith("[")) {
        tags.push(CQ.text(str));
        continue;
      }
      let exec = /^\[(?<head>CQ|FN|RG):(?<body>[^\]]+)]$/.exec(str);
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
          tags.push(...await this.parseFN(body, message));
          continue;
        default:
          let never: never = head;
          tags.push(CQ.text(str));
          console.log(never);
      }
    }
    return tags;
  }
  
  private static parseCQ(body: string, message: CQEvent<"message.group">): CQTag<any> {
    switch (body) {
      case "reply":
        return CQ.reply(message.context.message_id);
      case "at":
        return CQ.at(message.context.user_id);
      default:
        return CQ.text(body);
    }
  }
  
  private static async parseFN(body: string, message: CQEvent<"message.group">): Promise<CQTag<any>[]> {
    let split = body.split(".");
    if (split[1] === undefined) return [CQ.text(body)];
    let plug: Plug = Plug.plugs[split[0]];
    if (plug === undefined) return [CQ.text(`插件${split[0]}不存在`)];
    let plugFunc: Function = Reflect.get(plug, split[1]);
    if (Reflect.getMetadata(CanAutoCall.name, plugFunc) === true &&
        typeof plugFunc === "function" && plugFunc.length <= 1) {
      try {
        logger.info(`调用${body}`);
        return (await plugFunc.call(plug, message) as CQTag<any>[]);
      } catch (e) {
        logger.error("调用出错", e);
        return [CQ.text(`调用出错:` + body)];
      }
    }
    return [CQ.text(body)];
  }
  
  private static split(str: string): string[] {
    return str.split(/(?<=])|(?=\[)/);
  }
}
type Group = { regexp: string, reply?: string[], forward?: boolean }
