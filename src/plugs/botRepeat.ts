import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {CQTag, text} from "go-cqwebsocket/out/tags";
import Plug from "../Plug";
import RepeatCache from "../utils/repeat";

class BotRepeat extends Plug {
  private body: RepeatCache;
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ机器人-复读";
    this.description = "测试用";
    this.version = 0.1;
    
    this.body = new RepeatCache();
  }
  
  async install() {
    let def = await import("./bot").then(v => v.default);
    if (!def.bot) return;
    let bot = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        let tag: CQTag<text> = tags[0];
        if (tags.length !== 1 || tag.tagName !== "text") {
          return;
        }
        let msg = tag.get("text");
        if (msg.startsWith("/")) {
          return;
        }
        let {
          group_id,
          user_id,
        } = context;
        if (!this.body.check(group_id, user_id, msg, 3)) {
          return;
        }
        event.stopPropagation();
        bot.send_group_msg(group_id, [tag]).then(bot.messageSuccess, bot.messageFail);
      },
    });
  }
  
  async uninstall() {
    let def = await import("./bot").then(v => v.default);
    def.bot?.unbind(this.header);
  }
}

export default new BotRepeat();