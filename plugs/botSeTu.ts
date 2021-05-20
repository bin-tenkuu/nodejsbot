import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {logger} from "../utils/logger.js";
import {lolicon} from "../utils/Search.js";
import {sendAdminQQ, sendAuto, sendForward} from "../utils/Util.js";


class CQBotLoLiSeTu extends Plug {
  private isCalling: boolean;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-色图";
    this.description = "QQ群聊发送合并转发色图";
    this.version = 0;
    this.isCalling = false;
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getSeTu(event: CQEvent<"message.private"> | CQEvent<"message.group">,
      exec: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
    if (this.isCalling) {
      return [CQ.text("冷却中")];
    }
    this.isCalling = true;
    let groups = {
      keyword: exec.groups?.keyword,
      r18: exec.groups?.r18 !== undefined,
    };
    logger.info("开始色图", groups);
    try {
      let data = await lolicon(groups.keyword, groups.r18);
      if (data.code !== 0) {
        let message = CQBotLoLiSeTu.code(data.code);
        logger.warn(`开始色图异常：异常返回码(${data.code})：${message}`);
        this.isCalling = false;
        return [CQ.text(message)];
      }
      if (data.count < 1) {
        logger.warn(`开始色图异常：色图数量不足(${data.count})`);
        this.isCalling = false;
        return [CQ.text("色图数量不足")];
      }
      let first = data.data[0];
      logger.info(`剩余次数：${data.quota}||剩余重置时间：${data.quota_min_ttl}s`);
      sendAuto(event, "开始加载");
      if (event.contextType === "message.group") {
        let {
          context: {message_id: messageId, sender: {nickname: nickname, user_id: userId}},
        } = event;
        sendForward(event, [
          CQ.nodeId(messageId),
          CQ.node(nickname, userId, `标题：${first.title}
作者：${first.author}\n原图：www.pixiv.net/artworks/${first.pid}`),
          CQ.node(nickname, userId, CQ.escape(first.tags.join("\n"))),
        ]).catch(NOP);
      }
      let unlock = () => {
        this.isCalling = false;
        logger.info("解除锁定 %s", this.name);
      };
      if (data.quota < 5) {
        setTimeout(unlock, 2000 * Number(data.quota_min_ttl));
      } else {
        setTimeout(unlock, 1000);
      }
      return [CQ.image(first.url)];
    } catch (reason) {
      sendAdminQQ(event, "色图坏了");
      logger.info(reason);
      return [CQ.text("未知错误,或网络错误")];
    }
  }
  
  
  async install() {
  }
  
  async uninstall() {
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

export default new CQBotLoLiSeTu();
