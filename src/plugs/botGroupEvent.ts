import {CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {adminId} from "../configs/config";
import Plug from "../Plug";

class CQBotGroupEvent extends Plug {
  private header?: Partial<SocketHandle>;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-事件";
    this.description = "QQ群聊的各种事件";
    this.version = 0.1;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "notice.group_increase": (event, message) => {
        event.stopPropagation();
        let str = `@${message.user_id} 被管理员{@${message.operator_id}} ${
            message.sub_type === "approve" ? "同意" : "邀请"
        } 入群`;
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
          str = `@${message.user_id} 主动离开 本群`;
        }
        bot.send_group_msg(message.group_id, str).catch(() => { });
      },
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
}

export = new CQBotGroupEvent();