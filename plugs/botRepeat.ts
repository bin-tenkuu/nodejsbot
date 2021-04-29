import {CQTag, text} from "go-cqwebsocket/out/tags";
import {CQEvent} from "../../go-cqwebsocket";
import {Plug} from "../Plug";
import {RepeatCache} from "../utils/repeat";
import {sendAuto} from "../utils/Util";

export = new class BotRepeat extends Plug {
  private repeatCache = new RepeatCache<string>();
  
  constructor() {
    super(module);
    this.name = "QQ群聊-复读";
    this.description = "测试用";
    this.version = 0.1;
  }
  
  async install() {
    require("./bot").getGroup(this).push((event: CQEvent<"message.group">) => {
      let tag: CQTag<text> = event.cqTags[0];
      if (event.cqTags.length !== 1 || tag.tagName !== "text") {
        return;
      }
      let msg = tag.get("text");
      if (/^[-+$%^&*.]/.test(msg)) return;
      let {group_id, user_id} = event.context;
      if (this.repeatCache.check(group_id, user_id, msg, 4)) {
        event.stopPropagation();
        return sendAuto(event, BotRepeat.random(msg));
      }
    });
  }
  
  async uninstall() {
    require("./bot").delGroup(this);
  }
  
  static random(str: string): string {
    let arr = [...str];
    for (let i = arr.length - 1; i > 0; i--) {
      let j = (Math.random() * i) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }
}
