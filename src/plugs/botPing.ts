import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {CQWebSocket} from "go-cqwebsocket";
import Plug from "../Plug";

let CQ = require("go-cqwebsocket").CQ;

class CQBotPing extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-回复";
    this.description = "QQ群@回复";
    this.version = 0.5;
  }
  
  async install() {
    let def = require("./bot").default;
    if (!def.bot) return;
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        // 没有@自己
        if (!tags.some(tag => tag["tagName"] === "at" && tag.get("qq") === bot.qq)) {
          return;
        }
        // stopPropagation方法阻止事件冒泡到父元素
        event.stopPropagation();
        let {
          group_id,
          message_id,
          sender: {
            user_id,
          },
        } = context;
        let cqTags = context.message
          .replace(/\[[^\]]+]/g, "")
          .replace(/吗/g, "")
          .replace(/不/g, "很")
          .replace(/你/g, "我")
          .replace(/(?<!没)有/g, "没有")
          .replace(/[？?]/g, "!");
        bot.send_group_msg(group_id, [
          CQ.reply(message_id),
          CQ.at(user_id),
          CQ.text(cqTags),
        ]).then(bot.messageSuccess, bot.messageFail);
      },
    });
  }
  
  async uninstall() {
    let def = require("./bot").default;
    def.bot?.unbind(this.header);
  }
}

export default new CQBotPing();