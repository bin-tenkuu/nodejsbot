import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";
import {GroupEvent} from "../utils/Util";

type FunList = ((this: void, event: GroupEvent) => void)

class CQBotGroup extends Plug {
  private header?: Partial<SocketHandle>;
  private readonly helper: Map<Plug, FunList[]>;
  
  constructor() {
    super(module);
    this.name = "QQ群聊";
    this.description = "QQ群聊";
    this.version = 0.5;
    this.helper = new Map();
    this.get(this).push((event) => {
      if (/^为什么呢$/.test(event.text)) {
        event.bot.send_group_msg(event.context.group_id, "是啊，为什么呢，我也在寻找原因呢").catch(() => {});
        return true;
      }
      return false;
    });
  }
  
  set<T extends Plug>($this: T, list: FunList[]): void {
    this.helper.set($this, list);
  }
  
  get<T extends Plug>($this: T): FunList[] {
    let r = this.helper.get($this);
    if (r === undefined) {
      r = [];
      this.set($this, r);
    }
    return r;
  }
  
  del<T extends Plug>($this: T): void {
    this.helper.set($this, []);
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        let contextEvent = new GroupEvent(bot, context, tags, event);
        this.helper.forEach(funList => funList.forEach(func => func(contextEvent)));
        // console.log(contextEvent.isAtMe, event.isCanceled);
        if (event.isCanceled || !contextEvent.isAtMe) {
          return;
        }
        event.stopPropagation();
        let {
          group_id,
          message_id,
          user_id,
        } = context;
        let cqTags = contextEvent.text.replace(/吗/g, "")
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
    require("./bot").bot.unbind(this.header);
  }
  
}

export = new CQBotGroup();