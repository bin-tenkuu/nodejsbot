import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {adminId} from "../config/config.json";
import {Plug} from "../Plug";

export = new class CQBotEvents extends Plug {
  private header?: Partial<SocketHandle>;
  
  constructor() {
    super(module);
    this.name = "QQ其他-事件";
    this.description = "QQ的各种事件，非群聊";
    this.version = 0.1;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "notice.notify.poke.group": (event, message) => {
        if (+message.target_id !== bot.qq) {return;}
        event.stopPropagation();
        bot.send_group_msg(message.group_id, [
          CQ.at(message.user_id),
          CQ.text("憋戳我了"),
        ]).catch(() => {});
      },
      "notice.group_increase": (event, message) => {
        event.stopPropagation();
        let str;
        if (message.operator_id === 0) {
          str = `@${message.user_id} ${
              message.sub_type === "approve" ? "欢迎" : "被邀请"
          }入群`;
        } else {
          str = `@${message.user_id} 被管理员{@${message.operator_id}} ${
              message.sub_type === "approve" ? "同意" : "邀请"
          }入群`;
        }
        bot.send_group_msg(message.group_id, str).catch(() => { });
      },
      "notice.group_decrease": (event, message) => {
        event.stopPropagation();
        if (message.sub_type === "kick_me") {
          bot.send_private_msg(adminId, `群 ${message.group_id} 被踢出`).catch(() => { });
          return;
        }
        let str;
        if (message.sub_type === "kick") {
          str = `@${message.user_id} 被 管理员{@${message.operator_id}} 踢出本群`;
        } else {
          str = `@${message.user_id} 主动离开本群`;
        }
        bot.send_group_msg(message.group_id, str).catch(() => { });
      },
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
}
