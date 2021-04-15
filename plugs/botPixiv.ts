import {CQ} from "go-cqwebsocket";
import {MessageId, PromiseRes} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";
import {pixivCat} from "../utils/Search";
import {GroupEvent} from "../utils/Util";

export = new class CQBotPixiv extends Plug {
  constructor() {
    super(module);
    this.name = "QQ群聊-P站图片加载";
    this.description = "P站图片加载";
    this.version = 0;
  }
  
  async install() {
    let botGroup = require("./bot");
    botGroup.getGroup(this).push((event: GroupEvent) => {
      let exec = /^看{1,2}p站(?<pid>\d+)(?:-(?<p>\d+))?$/.exec(event.text);
      if (exec == null) return;
      event.stopPropagation();
      let {
        pid,
        p,
      } = (exec.groups as { pid?: string, p?: string });
      logger.debug(`p站图片请求：pid:${pid},p:${p}`);
      let {
        bot,
        context: {
          group_id,
          user_id,
          sender: {
            nickname,
          },
        },
      } = event;
      if (pid === undefined) {
        bot.send_group_msg(group_id, "pid获取失败").catch(() => {
          logger.warn("文字消息发送失败");
        });
        return;
      }
      pixivCat(pid).then(data => {
        logger.info(`请求状态:${data.success}`);
        if (!data.success) {
          bot.send_group_msg(group_id, [CQ.text(data.error)]).catch(() => {});
        } else {
          let promise: PromiseRes<MessageId>;
          if (data.multiple) {
            let {
              0: p0,
              1: p1,
              length,
            } = data.original_urls_proxy;
            if (p === undefined) {
              promise = bot.send_group_forward_msg(group_id, [
                CQ.node(nickname, user_id, `这个作品ID中有${length}张图片,需要指定第几张才能正确显示`),
                CQ.node(nickname, user_id, [CQ.image(p0)]),
                CQ.node(nickname, user_id, [CQ.image(p1)]),
              ]);
            } else if (+p >= length || +p === 0) {
              promise = bot.send_group_forward_msg(group_id, [
                CQ.node(nickname, user_id, `这个作品ID中只有${length}张图片,在范围内才能正确显示`),
                CQ.node(nickname, user_id, [CQ.image(data.original_urls_proxy[length - 1])]),
                CQ.node(nickname, user_id, [CQ.image(data.original_urls_proxy[length - 2])]),
              ]);
            } else {
              promise = bot.send_group_forward_msg(group_id, [
                CQ.node(nickname, user_id, `这个作品ID中有${length}张图片,这是第${p}张图片`),
                CQ.node(nickname, user_id, [CQ.image(data.original_urls_proxy[+p])]),
              ]);
            }
          } else {
            promise = bot.send_group_forward_msg(group_id, [
              CQ.node(nickname, user_id, [CQ.image(data.original_url_proxy)]),
            ]);
          }
          promise.catch(() => {
            logger.warn("合并转发发送失败");
            return bot.send_group_msg(group_id, "带图合并转发发送失败");
          }).catch(() => {
            logger.warn("文本发送失败");
          });
        }
      }).catch(() => {
        return bot.send_group_msg(group_id, [
          CQ.text("网络错误或内部错误"),
        ]);
      }).catch(() => {
        logger.warn("文本发送失败");
      });
    });
    botGroup.setGroupHelper("加载p站图片", [CQ.text("看p站(pid)(-p)")]);
  }
  
  async uninstall() {
    let botGroup = require("./botGroup");
    botGroup.delGroup(this);
    botGroup.delGroupHelper("加载p站图片");
  }
}

