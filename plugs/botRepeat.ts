import {CQEvent} from "../../go-cqwebsocket";
import {Plug} from "../Plug";
import {RepeatCache} from "../utils/repeat";
import {onlyText, sendAuto} from "../utils/Util";

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
      if (event.cqTags.some(tag => tag.tagName !== "text")) { return; }
      let msg = onlyText(event);
      if (/^[-+$%^&*.]/.test(msg)) return;
      let {group_id, user_id} = event.context;
      if (this.repeatCache.check(group_id, user_id, msg, 4)) {
        event.stopPropagation();
        if (msg.length < 3) {
          return sendAuto(event, msg);
        }
        event.bot.get_word_slices(msg).then(value => {
          sendAuto(event, BotRepeat.SendRandom(value.slices));
        }).catch(NOP);
      }
    });
  }
  
  async uninstall() {
    require("./bot").delGroup(this);
  }
  
  static SendRandom(str: string[]): string {
    let i = str.length - 1;
    for (; i > 0; i--) {
      let j = (Math.random() * i) | 0;
      [str[i], str[j]] = [str[j], str[i]];
    }
    return str.join("");
  }
}
