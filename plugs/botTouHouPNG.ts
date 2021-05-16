import {CQ, CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug";
import {canCallGroup, canCallPrivate} from "../utils/Annotation";
import {paulzzhTouHou} from "../utils/Search";
import {sendAuto} from "../utils/Util";

class CQBotTouHou extends Plug {
  #isRandom: boolean;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-东方图片";
    this.description = "随机东方图";
    this.version = 0.1;
  
    this.#isRandom = false;
  }
  
  async install() {
    this.#isRandom = false;
  }
  
  async uninstall() {
    this.#isRandom = true;
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getTouHouPNG(event: CQEvent<"message.group"> | CQEvent<"message.private">): Promise<CQTag<any>[]> {
    if (this.#isRandom) {
      return [CQ.text(`冷却中`)];
    }
    this.#isRandom = true;
    console.log("开始东方");
    sendAuto(event, "随机东方图加载中");
    try {
      let json = await paulzzhTouHou();
      setTimeout(() => {
        this.#isRandom = false;
      }, 1000 * 10);
      return [CQ.image(json.url), CQ.text("作者:" + json.author)];
    } catch (e) {
      return [CQ.text(`东方图API调用错误`)];
    }
  }
}

export = new CQBotTouHou()