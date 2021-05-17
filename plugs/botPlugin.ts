import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {canCallGroup, canCallPrivate} from "../utils/Annotation";
import {db} from "../utils/database";
import bot from "./bot";

type Corpus = {
  name: string, regexp: RegExp, reply: string,
  forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number
}

class CQBotPlugin extends Plug {
  
  constructor() {
    super(module);
    this.name = "QQBot插件系统";
    this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
    this.version = 0.8;
  }
  
  @canCallPrivate()
  @canCallGroup()
  async getter(event: CQEvent<"message.private"> | CQEvent<"message.group">, execArray: RegExpExecArray) {
    event.stopPropagation();
    let {type} = execArray.groups as { type?: string } ?? {};
    if (type === undefined) return [];
    switch (type) {
      case "群列表":
        return event.bot.get_group_list().then(list => {
          let s = list.map(group => `(${group.group_id})${group.group_name}`).join("\n");
          return [CQ.text(s)];
        });
      case "好友列表":
        return event.bot.get_friend_list().then(list => {
          let s = list.map(friend => `(${friend.user_id})${friend.nickname}:(${friend.remark})`).join("\n");
          return [CQ.text(s)];
        });
      case "ban列表":
        return db.start(async db => {
          let list = await db.all<{ id: number }[]>(`select id from Members where baned = 1`);
          await db.close();
          let s = list.map(v => v.id).join("\n");
          return [CQ.text(s)];
        });
      case "插件列表": {
        let s = [...Plug.plugs.values()].map((p, i) =>
            `${i}. ${p.installed} <- ${p.name}`).join("\n");
        return [CQ.text(s)];
      }
      case "poke":
        return db.start(async db => {
          let all = await db.all<{ id: number, text: string }[]>("select id, text from pokeGroup");
          let uin = event.context.self_id;
          let map = all.map(v => CQ.node(String(v.id), uin, v.text));
          await db.close();
          return map;
        });
      default:
        return [];
    }
  }
  
  @canCallPrivate()
  @canCallGroup()
  async setter(event: CQEvent<"message.private"> | CQEvent<"message.group">, execArray: RegExpExecArray) {
    event.stopPropagation();
    let {type, other = ""} = execArray.groups as { type?: string, other?: string } ?? {};
    switch (type) {
      case "ban":
        return [CQ.text(this.setBanQQ(other, 1))];
      case "unban":
        return [CQ.text(this.setBanQQ(other, 0))];
      default:
        return [];
    }
  }
  
  /**
   * { open?: "开" | "关" }
   */
  @canCallPrivate()
  @canCallGroup()
  async pluginList(event: CQEvent<"message.private"> | CQEvent<"message.group">, execArray: RegExpExecArray) {
    event.stopPropagation();
    let {type, open} = execArray.groups as { type?: "私聊" | "群聊", open?: "开" | "关" } ?? {};
    let list: Corpus[];
    if (type === "私聊") {
      list = bot.corpusPrivate;
    } else if (type === "群聊") {
      return [CQ.text("未做完")];
    } else {
      return [];
    }
    let isOpen: boolean;
    if (open === "开") {
      isOpen = true;
    } else if (open === "关") {
      isOpen = false;
    } else {
      return [];
    }
    let filter = list.map((msg, index) => ({regex: msg.regexp, isOpen: msg.isOpen, index}))
        .filter(msg => msg.isOpen === isOpen)
        .map(({regex, index}) => `${index} :${regex}`)
        .join("\n");
    return [CQ.text(filter)];
  }
  
  /**
   * { open?: "开" | "关", nums?: string }
   */
  @canCallPrivate()
  @canCallGroup()
  async pluginStat(event: CQEvent<"message.private"> | CQEvent<"message.group">,
      execArray: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
    let {
      open, nums,
    } = execArray.groups as { open?: "开" | "关", nums?: string } ?? {};
    if (nums === undefined) return [];
    let number = +nums;
    let s: boolean;
    if (open === "开") {
      s = true;
    } else if (open === "关") {
      s = false;
    } else {
      return [];
    }
    let element = bot.corpusPrivate[number];
    if (element === undefined) return [];
    element.isOpen = s;
    return [CQ.text("回复变动id:" + number)];
  }
  
  @canCallPrivate()
  @canCallGroup()
  async pluginInfo(event: CQEvent<"message.private"> | CQEvent<"message.group">,
      execArray: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
    let {
      nums,
    } = execArray.groups as { nums?: string } ?? {};
    if (nums === undefined) return [];
    let element = bot.corpusPrivate[+nums];
    if (element === undefined) return [];
    return [CQ.text(`RegExp: ${element.regexp.toString()
    }\n isOpen: ${element.isOpen}\n needAdmin: ${element.needAdmin
    }\n reply: ${element.reply}`)];
  }
  
  async install() {
  }
  
  async uninstall() {
  }
  
  private setBanQQ(text: string, ban: 0 | 1) {
    let matches = text.match(/\d+/g) ?? [];
    db.start(async db => {
      for (const value of matches) {
        await db.run(`update Members set baned = ? where id = ?;`, ban, value);
      }
      await db.close();
    }).catch(NOP);
    return matches.join("\n");
  }
}

export = new CQBotPlugin();