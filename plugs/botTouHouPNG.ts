import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {paulzzhTouHou} from "../utils/Search";

export = new class CQBotTouHou extends Plug {
  private isRandom: boolean;
  private header?: Partial<SocketHandle>;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-东方图片";
    this.description = "随机东方图";
    this.version = 0.1;
    
    this.isRandom = false;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        let cqTag = tags.find(tag => tag["tagName"] === "text");
        if (!cqTag) {
          return;
        }
        let txt = cqTag.get("text");
        if (/^东方图来$/.test(txt)) {
          switch (this.isRandom) {
            case true:
              return;
            case false:
              this.isRandom = true;
          }
          console.log("开始东方");
          event.stopPropagation();
          let {
            group_id,
          } = context;
          bot.send_group_msg(group_id, [
            CQ.text("随机东方图加载中"),
          ]).catch(() => {});
          paulzzhTouHou().then(json => {
            bot.send_group_msg(group_id, [
              CQ.image(json["url"]),
            ]).catch(() => {});
            setTimeout(() => {
              this.isRandom = false;
            }, 1000);
          }).catch(err => {
            console.error(err);
            bot.send_group_msg(group_id, [
              CQ.text(`东方图API调用错误`),
            ]).catch(() => {});
          });
        }
      },
    });
  };
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
}
