import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";

class CQBotPing extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-回复";
    this.description = "QQ群@回复";
    this.version = 0.5;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        // 没有@自己
        if (!tags.some(tag => tag["tagName"] === "at" && +tag.get("qq") === context.self_id)) {
          return;
        }
        event.stopPropagation();
        let {
          group_id,
          message_id,
          user_id,
        } = context;
        let text: string = tags.find(tag => tag.tagName === "text")?.get("text") ?? "";
        let isRun = def.switchRun(text.trimStart(), [
          [/^为什么呢$/, () => {
            bot.send_group_msg(group_id, "是啊，为什么呢，我也在寻找原因呢").catch(() => {});
          }],
          // [/^.?为什么([^呢]*呢)?$/, () => {
          //   bot.send_group_msg(group_id, [
          //     CQ.json(CQ.escape(JSON.stringify(require("../configs/QualityAnswer.json")))),
          //   ]).catch(() => {});
          // }],
        ]);
        if (isRun) {
          return;
        }
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
        ]).catch(() => {});
        return;
      },
    });
  }
  
  async uninstall() {
    let def = require("./bot");
    def._bot?.unbind(this.header);
  }
}

export = new CQBotPing();