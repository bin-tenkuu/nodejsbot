import {CQTag, text} from "go-cqwebsocket/out/tags";
import Plug from "../Plug";
import RepeatCache from "../utils/repeat";
import {ContextEvent} from "../utils/Util";

class BotRepeat extends Plug {
  private repeatCache = new RepeatCache();
  
  constructor() {
    super(module);
    this.name = "QQ群聊-复读";
    this.description = "测试用";
    this.version = 0.1;
  }
  
  async install() {
    require("./botPing").get(this).push((event: ContextEvent) => {
      let tag: CQTag<text> = event.tags[0];
      if (event.length !== 1 || tag.tagName !== "text") {
        return;
      }
      let msg = tag.get("text");
      if (msg.startsWith(".")) {
        return;
      }
      let {
        group_id,
        user_id,
      } = event.context;
      if (this.repeatCache.check(group_id, user_id, msg, 4)) {
        event.stopPropagation();
        event.bot.send_group_msg(group_id, tag.toString()).catch(() => {});
      }
    });
  }
  
  async uninstall() {
    require("./botPing").del(this);
  }
}

export = new BotRepeat();