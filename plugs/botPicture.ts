import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {logger} from "../utils/logger.js";
import {lolicon, paulzzhTouHou, pixivCat} from "../utils/Search.js";
import {sendAdminQQ, sendAuto, sendForward} from "../utils/Util.js";


class CQBotPicture extends Plug {
  private isCalling: boolean;
  
  #isRandomToho: boolean;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-图片相关";
    this.description = "QQ群聊发送各种图片";
    this.version = 0;
    this.isCalling = false;
    
    
    this.#isRandomToho = false;
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
        let message = CQBotPicture.code(data.code);
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
        setTimeout(unlock, 1000 * Number(data.quota_min_ttl));
      } else {
        setTimeout(unlock, 1000 * 5);
      }
      return [CQ.image(CQBotPicture.get1200(first.url))];
    } catch (reason) {
      sendAdminQQ(event, "色图坏了");
      logger.info(reason);
      return [CQ.text("未知错误,或网络错误")];
    }
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getPixiv(event: CQEvent<"message.group"> | CQEvent<"message.private">,
      exec: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
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
        let length = urlsProxy.length;
        if (p === undefined) {
          let {0: p0, 1: p1} = urlsProxy;
          return [
            CQ.text(`总共${length}张图片,这是第0,1张`),
            CQ.image(CQBotPicture.get1200(p0)),
            CQ.image(CQBotPicture.get1200(p1)),
          ];
        } else {
          let ps: number = +p > length ? length - 1 : +p;
          return [
            CQ.text(`总共${length}张图片,这是第${p}-1,${p}张`),
            CQ.image(CQBotPicture.get1200(urlsProxy[ps - 1])),
            CQ.image(CQBotPicture.get1200(urlsProxy[ps])),
          ];
        }
      } else {
        return [CQ.image(CQBotPicture.get1200(data.original_url_proxy))];
      }
    } catch (e) {
      sendAdminQQ(event, "p站图片加载出错");
      return [CQ.text("网络请求错误或内部错误")];
    }
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getTouHouPNG(event: CQEvent<"message.group"> | CQEvent<"message.private">): Promise<CQTag<any>[]> {
    if (this.#isRandomToho) {
      return [CQ.text(`冷却中`)];
    }
    this.#isRandomToho = true;
    console.log("开始东方");
    sendAuto(event, "随机东方图加载中");
    try {
      let json = await paulzzhTouHou();
      setTimeout(() => {
        this.#isRandomToho = false;
      }, 1000 * 60);
      return [CQ.image((json.url)), CQ.text("作者:" + json.author)];
    } catch (e) {
      return [CQ.text(`东方图API调用错误`)];
    }
  }
  
  private static get1200(str: string) {
    return str.replace("original", "master").replace(/(.\w+)$/, "_master1200.jpg");
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

export default new CQBotPicture();
