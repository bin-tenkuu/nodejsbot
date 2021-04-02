import {CQ} from "go-cqwebsocket";
import Plug from "../Plug";
import {pixivCat} from "../utils/Search";
import {GroupEvent} from "../utils/Util";
import {logger} from "../utils/logger";

class CQBotPixiv extends Plug {
  constructor() {
    super(module);
    this.name = "QQ群聊-P站图片加载";
    this.description = "P站图片加载";
    this.version = 0;
  }
  
  async install() {
    require("./botGroup").get(this).push((event: GroupEvent) => {
      let exec = /^看{1,2}p站(?<pid>\d+)$/.exec(event.text);
      if (exec) {
        event.stopPropagation();
        let pid = (exec.groups as { pid?: string }).pid;
        let {
          bot,
          context: {
            group_id,
            user_id,
            sender,
          },
        } = event;
        let name = sender.card ?? sender.nickname;
        if (pid === undefined) {
          bot.send_group_msg(group_id, "pid获取失败").catch(() => {
            logger.info("文字消息发送失败");
          });
          return;
        }
        pixivCat(pid).then(data => {
          logger.info(data);
          if (data.success) {
            let promise = data.multiple ?
                bot.send_group_forward_msg(group_id, data.original_urls_proxy.map(url => {
                  return CQ.node(name, user_id, [CQ.image(url)]);
                })) :
                bot.send_group_forward_msg(group_id, [
                  CQ.node(name, user_id, [CQ.image(data.original_url_proxy)]),
                ]);
            promise.catch(() => {
              logger.warn("合并转发发送失败");
              return bot.send_group_msg(group_id, "带图合并转发发送失败");
            }).catch(() => {
              logger.warn("文本发送失败");
            });
          } else {
            bot.send_group_msg(group_id, [CQ.text(data.error)]).catch(() => {});
          }
        }).catch(() => {
          bot.send_group_msg(group_id, [
            CQ.text("网络错误或内部错误"),
          ]);
        }).catch(() => {
          logger.warn("文本发送失败");
        });
      }
    });
  }
  
  async uninstall() {
    require("./botGroup").del(this);
  }
}

export = new CQBotPixiv();
