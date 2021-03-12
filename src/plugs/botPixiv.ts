import {CQ} from "go-cqwebsocket";
import Plug from "../Plug";
import {pixivProxy} from "../utils/Search";
import {ContextEvent} from "../utils/Util";

class CQBotPixiv extends Plug {
  constructor() {
    super(module);
    this.name = "QQ群聊-P站图片加载";
    this.description = "P站图片加载";
    this.version = 0;
  }
  
  async install() {
    require("./botPing").get(this).push((event: ContextEvent) => {
      let exec = /^看{1,2}p站(?<pid>\d+(?:-\d+)?)$/.exec(event.text);
      if (exec) {
        event.stopPropagation();
        let pid = (exec.groups as { pid?: string }).pid;
        if (pid == undefined) {
          event.bot.send_group_msg(event.context.group_id, "pid获取失败").catch(() => {
            console.log("文字消息发送失败");
          });
          return;
        }
        pixivProxy(pid).then(value => {
          event.bot.send_group_msg(event.context.group_id, [
            CQ.image(value),
          ]).catch(() => {
            console.log("图片发送失败");
            return event.bot.send_group_msg(event.context.group_id, "图片发送失败");
          }).catch(() => {
            console.log("文本都发送失败");
          });
        }).catch((reason) => {
          event.bot.send_group_msg(event.context.group_id, [
            CQ.text(/(?<=<p>)[^<]+/.exec(reason)?.[0] ?? ""),
          ]).catch(() => {});
        });
      }
    });
  }
  
  async uninstall() {
    require("./botPing").del(this);
  }
}

export = new CQBotPixiv();
