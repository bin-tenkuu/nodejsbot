import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
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
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
}
