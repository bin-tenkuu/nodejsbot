import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {canCallGroup, canCallPrivate} from "../utils/Annotation";
import {logger} from "../utils/logger";
import {pixivCat} from "../utils/Search";
import {onlyText, sendAdminQQ, sendForward, sendGroup} from "../utils/Util";

class CQBotPixiv extends Plug {
  constructor() {
    super(module);
    this.name = "QQ群聊-P站图片加载";
    this.description = "P站图片加载";
    this.version = 0;
  }
  
  async install() {
    let botGroup = require("./bot");
    botGroup.getGroup(this).push((event: CQEvent<"message.group">) => {
      this.runPixiv(event);
    });
    botGroup.setGroupHelper("加载p站图片", [CQ.text("看p站[pid](-p)")]);
  }
  
  async uninstall() {
    let botGroup = require("./bot");
    botGroup.delGroup(this);
    botGroup.delGroupHelper("加载p站图片");
  }
  
  private async runPixiv(event: CQEvent<"message.group">) {
    let exec = /^看{1,2}p站(?<pid>\d+)(?:-(?<p>\d+))?$/.exec(onlyText(event));
    if (exec == null) return;
    event.stopPropagation();
    let content = await this.getPixiv(event, exec);
    if (content.length === 1) {
      sendGroup(event, content);
    } else {
      let {user_id, nickname} = event.context.sender;
      sendForward(event, [CQ.node(nickname, user_id, content)]);
    }
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getPixiv(event: CQEvent<"message.group"> | CQEvent<"message.private">,
      exec: RegExpExecArray): Promise<CQTag<any>[]> {
    let {pid, p} = (exec.groups as { pid?: string, p?: string }) ?? {};
    logger.debug(`p站图片请求：pid:${pid},p:${p}`);
    if (pid === undefined) {
      return [CQ.text("pid获取失败")];
    }
    try {
      let data = await pixivCat(pid);
      if (!data.success) {
        logger.info(`请求失败`);
        return [CQ.text(data.error)];
      }
      logger.info(`多张图片:${data.multiple}`);
      if (data.multiple) {
        let urlsProxy = data.original_urls_proxy;
        if (p === undefined) {
          let {0: p0, 1: p1, length} = urlsProxy;
          return [
            CQ.text(`这个作品ID中有${length}张图片,需要指定第几张才能正确显示`),
            CQ.image(p0), CQ.image(p1),
          ];
        } else {
          let ps: number = +p > length ? length - 1 : +p;
          return [
            CQ.text(`这个作品ID中有${length}张图片,这是第${p}张图片`),
            CQ.image(urlsProxy[ps - 1]), CQ.image(urlsProxy[ps]),
          ];
        }
      } else {
        return [CQ.image(data.original_url_proxy)];
      }
    } catch (e) {
      sendAdminQQ(event, "p站图片加载出错");
      return [CQ.text("网络请求错误或内部错误")];
    }
  }
}

export = new CQBotPixiv()