import {CQ, CQWebSocket} from "go-cqwebsocket";
import {message, messageNode, SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {GroupEvent} from "../utils/Util";

type FunList = ((this: void, event: GroupEvent) => void)

export = new class CQBotGroup extends Plug {
  private header?: Partial<SocketHandle>;
  private readonly handler: Map<Plug, FunList[]>;
  private readonly helper: Map<string, message>;
  
  constructor() {
    super(module);
    this.name = "QQ群聊";
    this.description = "QQ群聊";
    this.version = 0.5;
    this.handler = new Map();
    this.helper = new Map();
    this.get(this).push(event => {
      if (!event.isAtMe || !/^(?:help|帮助)/.test(event.text)) return;
      event.stopPropagation();
      let msgNode: messageNode[] = [];
      this.helper.forEach((value, key) => {
        msgNode.push(CQ.node(key, event.bot.qq, value));
      });
      event.bot.send_group_forward_msg(event.context.group_id, msgNode);
    });
  }
  
  setHelper(name: string, node: message): void {
    this.helper.set(name, node);
  }
  
  delHelper(name: string): void {
    this.helper.delete(name);
  }
  
  set(plug: Plug, list: FunList[]): void {
    this.handler.set(plug, list);
  }
  
  get(plug: Plug): FunList[] {
    let r = this.handler.get(plug);
    if (r === undefined) {
      r = [];
      this.set(plug, r);
    }
    return r;
  }
  
  del(plug: Plug): void {
    this.handler.set(plug, []);
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        let contextEvent = new GroupEvent(bot, context, tags, event);
        this.handler.forEach(funList => funList.forEach(func => func(contextEvent)));
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
