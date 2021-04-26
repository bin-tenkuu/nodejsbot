import {CQ, CQEvent} from "go-cqwebsocket";
import {MessageId, PromiseRes} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";
import {pixivCat} from "../utils/Search";
import {onlyText, sendAuto, sendForward} from "../utils/Util";

export = new class CQBotPixiv extends Plug {
  constructor() {
    super(module);
    this.name = "QQ群聊-P站图片加载";
    this.description = "P站图片加载";
    this.version = 0;
  }
  
  async install() {
    let botGroup = require("./bot");
    botGroup.getGroup(this).push((event: CQEvent<"message.group">) => {
      let exec = /^看{1,2}p站(?<pid>\d+)(?:-(?<p>\d+))?$/.exec(onlyText(event));
      if (exec == null) return;
      event.stopPropagation();
      let {pid, p} = (exec.groups as { pid?: string, p?: string });
      logger.debug(`p站图片请求：pid:${pid},p:${p}`);
      let {user_id, nickname} = event.context.sender;
      if (pid === undefined) {
        return sendAuto(event, "pid获取失败");
      }
      pixivCat(pid).then(data => {
        logger.info(`请求状态:${data.success}`);
        if (!data.success) {
          sendAuto(event, [CQ.text(data.error)]);
        } else {
          let promise: PromiseRes<MessageId> | undefined;
          if (data.multiple) {
            let {
              0: p0,
              1: p1,
              length,
            } = data.original_urls_proxy;
            if (p === undefined) {
              promise = sendForward(event, [
                CQ.node(nickname, user_id, `这个作品ID中有${length}张图片,需要指定第几张才能正确显示`),
                CQ.node(nickname, user_id, [CQ.image(p0), CQ.image(p1)]),
              ]);
            } else if (+p >= length || +p === 0) {
              promise = sendForward(event, [
                CQ.node(nickname, user_id, `这个作品ID中只有${length}张图片,在范围内才能正确显示`),
                CQ.node(nickname, user_id, [
                  CQ.image(data.original_urls_proxy[length - 2]),
                  CQ.image(data.original_urls_proxy[length - 1]),
                ]),
              ]);
            } else {
              promise = sendForward(event, [
                CQ.node(nickname, user_id, `这个作品ID中有${length}张图片,这是第${p}张图片`),
                CQ.node(nickname, user_id, [CQ.image(data.original_urls_proxy[+p])]),
              ]);
            }
          } else {
            promise = sendForward(event, [
              CQ.node(nickname, user_id, [CQ.image(data.original_url_proxy)]),
            ]);
          }
          promise?.catch(() => {
            logger.warn("合并转发发送失败");
            return sendAuto(event, "带图合并转发发送失败");
          }).catch(() => {
            logger.warn("文本发送失败");
          });
        }
      }).catch(() => {
        return sendAuto(event, "网络错误或内部错误");
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

