import {CQEvent} from "go-cqwebsocket";
import {groupMSG} from "../config/corpus.json";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";
import {deleteMsg, isAdminQQ, onlyText, parseMessage, sendForward, sendForwardQuick, sendGroup} from "../utils/Util";

export = new class CQBotCorpus extends Plug {
  corpus: Group[];
  
  constructor() {
    super(module);
    this.name = "语料库";
    this.description = "Bot 语料库,支持私聊/群聊/合并转发";
    this.version = 0.1;
    
    this.corpus = groupMSG.map(msg => ({
      regexp: new RegExp(msg.regexp),
      reply: msg.reply ?? "",
      forward: msg.forward === true,
      needAdmin: msg.needAdmin === true,
      isOpen: msg.isOpen !== false,
      delMSG: msg.delMSG ?? 0,
    }));
  }
  
  async install() {
    require("./bot").getGroup(this).push(async (event: CQEvent<"message.group">) => {
      let text = onlyText(event);
      let isAdmin = isAdminQQ(event);
      for (const element of this.corpus) {
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
    });
  }
  
  async uninstall() {
    require("./bot").delGroup(this);
  }
  
}
type Group = { regexp: RegExp, reply: string, forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number }
