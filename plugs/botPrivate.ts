import {CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {PrivateEvent} from "../utils/Util";

type FunList = ((this: void, event: PrivateEvent) => void)

export = new class CQBotPrivate extends Plug {
  private header?: Partial<SocketHandle>;
  private readonly helper: Map<Plug, FunList[]>;
  
  constructor() {
    super(module);
    this.name = "QQ私聊";
    this.description = "QQ私聊";
    this.version = 0.1;
    this.helper = new Map<Plug, FunList[]>();
  }
  
  set(plug: Plug, list: FunList[]): void {
    this.helper.set(plug, list);
  }
  
  get(plug: Plug): FunList[] {
    let r = this.helper.get(plug);
    if (r === undefined) {
      r = [];
      this.set(plug, r);
    }
    return r;
  }
  
  del(plug: Plug): void {
    this.helper.set(plug, []);
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.private": (event, context, tags) => {
        let contextEvent = new PrivateEvent(bot, context, tags, event);
        this.helper.forEach(funList => funList.forEach(func => func(contextEvent)));
        // console.log(contextEvent.isAtMe, event.isCanceled);
        if (event.isCanceled) return;
        event.stopPropagation();
        bot.send_private_msg(context.user_id, `收到消息,但未命中处理`).catch(() => {});
        return;
      },
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
  
}
