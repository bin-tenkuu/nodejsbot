import {CQ, CQEvent} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {canCallGroup} from "../utils/Annotation";
import {RepeatCache} from "../utils/repeat";

class BotRepeat extends Plug {
  private repeatCache = new RepeatCache<string>();
  
  constructor() {
    super(module);
    this.name = "QQ群聊-复读";
    this.description = "测试用";
    this.version = 0.1;
  }
  
  @canCallGroup()
  async getRepeat(event: CQEvent<"message.group">) {
    let {group_id, user_id, raw_message} = event.context;
    this.repeatCache.addData(group_id, user_id, raw_message);
    if (event.cqTags.some(tag => tag.tagName !== "text")) return [];
    let msg = event.cqTags.join("");
    if (/^[-+$%^&*.]/.test(msg)) return [];
    if (this.repeatCache.check(group_id, 4)) {
      event.stopPropagation();
      if (msg.length < 3) {
        return [CQ.text(msg)];
      }
      let slices = await event.bot.get_word_slices(msg);
      return [CQ.text(BotRepeat.SendRandom(slices.slices))];
      
    }
    return [];
  }
  
  async install() {}
  
  async uninstall() {}
  
  static SendRandom(str: string[]): string {
    let i = str.length - 1;
    for (; i > 0; i--) {
      let j = (Math.random() * i) | 0;
      [str[i], str[j]] = [str[j], str[i]];
    }
    return str.join("");
  }
}

export default new BotRepeat();