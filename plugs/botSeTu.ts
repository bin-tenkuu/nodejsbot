import {CQ} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";
import {lolicon} from "../utils/Search";
import {GroupEvent} from "../utils/Util";

export = new class CQBotLoLiSeTu extends Plug {
  private isCalling: boolean;
  private cacheURL?: string;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-色图";
    this.description = "QQ群聊发送合并转发色图";
    this.version = 0;
    this.isCalling = false;
  }
  
  async install() {
    let botGroup = require("./bot");
    botGroup.getGroup(this).push((event: GroupEvent) => {
      let exec = /^[来來发發给給][张張个個幅点點份](?<r18>[Rr]18的?)?(?<keyword>.*?)?的?[色瑟][图圖]$/.exec(event.text);
      if (exec == null) {
        return;
      }
      let groups = {
        r18: exec.groups?.r18 !== undefined,
        keyword: exec.groups?.keyword,
      };
      if (this.isCalling) {
        logger.info("冷却中", groups);
        return;
      } else {
        this.isCalling = true;
      }
      logger.info("开始色图", groups);
      let {
        context: {
          message_id: messageId,
          group_id: groupId,
          sender: {
            nickname: nickname,
          },
          user_id: userId,
        },
        bot: bot,
      } = event;
      event.stopPropagation();
      lolicon(groups.keyword, groups.r18).then(value => {
        if (value.code !== 0) {
          let message = CQBotLoLiSeTu.code(value.code);
          logger.warn(`开始色图异常：异常返回码(${value.code})：${message}`);
          bot.send_group_msg(groupId, message).catch(() => {});
          this.isCalling = false;
          return;
        }
        if (value.count < 5) {
          bot.send_group_msg(groupId, "色图数量不足").catch(() => {});
          logger.warn(`开始色图异常：色图数量不足(${value.count})`);
          this.isCalling = false;
          return;
        }
        let first = value.data[0];
        logger.info(`剩余次数：${value.quota}||剩余重置时间：${value.quota_min_ttl}s`);
        Promise.all([
          bot.send_group_msg(groupId, "开始加载"),
          bot.send_group_forward_msg(groupId, [
            CQ.nodeId(messageId),
            CQ.node(nickname, userId, `标题：${first.title}
作者：${first.author}\n原图：www.pixiv.net/artworks/${first.pid}`),
            CQ.node(nickname, userId, CQ.escape(first.tags.join("\n"))),
          ]),
          bot.send_group_msg(groupId, [CQ.image(first.url)]).then((msgID) => {
            setTimeout(() => {
              this.cacheURL = first.url;
              bot.delete_msg(msgID.message_id).catch(() => {});
            }, 1000 * 60);
          }).catch(() => {
            return bot.send_group_msg(groupId, "图片发送失败,ban?").catch(() => {});
          }),
        ]).catch(() => {}).finally(() => {
          let unlock = () => {
            this.isCalling = false;
            logger.info("解除锁定 %s", this.name);
          };
          if (value.quota < 5) {
            setTimeout(unlock, 1000 * Number(value.quota_min_ttl));
          } else {
            unlock();
          }
        });
      }).catch(reason => {
        bot.send_group_msg(groupId, "未知错误,或网络错误").catch(() => {});
        bot.send_private_msg(2938137849, "色图坏了").catch(() => {});
        logger.info(reason);
        return this.uninstall();
      });
    });
    botGroup.setGroupHelper("色图", [CQ.text("[来來发發给給][张張个個幅点點份]([Rr]18的?)?(.*?)?的?[色瑟][图圖]")]);
  }
  
  async uninstall() {
    let botGroup = require("./bot");
    botGroup.delGroup(this);
    botGroup.delGroupHelper("色图");
  }
  
  static code(code: number) {
    switch (code) {
      case -1  :
        return "内部错误";// 请向 i@loli.best 反馈
      case 0   :
        return "成功";
      case 401 :
        return "APIKEY 不存在或被封禁";
      case 403 :
        return "由于不规范的操作而被拒绝调用";
      case 404 :
        return "找不到符合关键字的色图";
      case 429 :
        return "达到调用额度限制";
      default:
        return "未知的返回码";
    }
  }
}

