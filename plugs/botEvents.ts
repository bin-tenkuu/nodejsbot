import {CQ, CQEvent, CQWebSocket} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {isAdminQQ, onlyText, sendAdminQQ} from "../utils/Util";

export = new class CQBotEvents extends Plug {
  private header?: PartialSocketHandle;
  private pokeGroupInner: boolean;
  private pokeGroup: string[];
  
  constructor() {
    super(module);
    this.name = "QQ其他-事件";
    this.description = "QQ的各种事件，非群聊";
    this.version = 0.1;
    
    this.header = undefined;
    this.pokeGroupInner = false;
    this.pokeGroup = [];
  }
  
  async install() {
    this.init();
    this.header = (<CQWebSocket>require("./bot").bot).bind("on", {
      "notice.notify.poke.group": (event) => {
        let target_id = event.context.target_id;
        if (target_id !== event.bot.qq) {return;}
        if (this.pokeGroupInner) return;
        this.pokeGroupInner = true;
        event.stopPropagation();
        setTimeout(() => {
          let {bot, context: {group_id}} = event;
          let str = this.pokeGroup[Math.random() * this.pokeGroup.length | 0];
          bot.send_group_msg(group_id, str).catch(NOP);
          this.pokeGroupInner = false;
          logger.info("pokeGroupInner = false");
        }, 3000);
      },
      "notice.group_increase": (event) => {
        event.stopPropagation();
        let {operator_id, user_id, sub_type, group_id} = event.context;
        let str;
        if (operator_id === 0) {
          str = `@${user_id} ${sub_type === "approve" ? "欢迎" : "被邀请"}入群`;
        } else {
          str = `@${user_id} 被管理员{@${operator_id}} ${sub_type === "approve" ? "同意" : "邀请"}入群`;
        }
        event.bot.send_group_msg(group_id, str).catch(() => { });
      },
      "notice.group_decrease": (event) => {
        event.stopPropagation();
        let {sub_type, group_id, user_id, operator_id} = event.context;
        if (sub_type === "kick_me") {
          sendAdminQQ(event, `群 ${group_id} 被踢出`);
          return;
        }
        let str;
        if (sub_type === "kick") {
          str = `@${user_id} 被 管理员{@${operator_id}} 踢出本群`;
        } else {
          str = `@${user_id} 主动离开本群`;
        }
        event.bot.send_group_msg(group_id, str).catch(() => { });
      },
      "request.friend": (event) => {
        event.stopPropagation();
        let {user_id, flag} = event.context;
        sendAdminQQ(event, `${user_id}请求加好友`);
        event.bot.set_friend_add_request(flag, true).catch(NOP);
      },
      "request.group": (event) => {
        event.stopPropagation();
        let {flag, sub_type, group_id} = event.context;
        sendAdminQQ(event, `${group_id}请求入群`);
        event.bot.set_group_add_request(flag, sub_type, true);
      },
    });
    require("./bot").getPrivate(this).push((event: CQEvent<"message.private">) => {
      this.runPrivate(event);
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
    require("./bot").delPrivate(this);
  }
  
  private init() {
    db.start(async db => {
      let all = await db.all<{ text: string }[]>(`select text from pokeGroup`);
      this.pokeGroup = all.map(v => v.text);
    }).catch(NOP);
  }
  
  private runPrivate(event: CQEvent<"message.private">) {
    if (!isAdminQQ(event)) { return; }
    let text = onlyText(event);
    switch (text) {
      case "设置poke":
        sendAdminQQ(event, "请发送");
        event.bot.once("message.private", event => {
          let tags = event.cqTags.map(tag => {
            if (tag.tagName === "text") return tag;
            if (tag.tagName === "image") return CQ.image(tag.get("url"));
            return CQ.text(`未支持tag:` + tag.tagName);
          }).join("");
          db.start(async db => {
            await db.run(`insert into pokeGroup(text) values(?)`, tags);
            this.pokeGroup.push(tags);
          }).catch(NOP);
          console.log(tags);
          sendAdminQQ(event, tags);
        });
        break;
      case "删除poke":
        db.start(async db => {
          let matches = text.match(/\d+(?=\s)?/g) ?? [];
          let statement = await db.prepare("delete from pokeGroup where id=?");
          for (let match of matches) {
            await statement.run(matches);
          }
          await statement.finalize();
          this.pokeGroup = await db.all("select id,text from pokeGroup");
          sendAdminQQ(event, "已删除:" + matches.join(","));
        }).catch(NOP);
        break;
    }
  }
}
