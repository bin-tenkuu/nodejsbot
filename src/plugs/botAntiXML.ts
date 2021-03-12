import {CQ, CQWebSocket} from "go-cqwebsocket";
import {messageNode, SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {CQTag, node} from "go-cqwebsocket/out/tags";
import "xmldom-ts";
import Plug from "../Plug";


class CQAntiXML extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-防XML";
    this.description = "群消息防XML消息插件,使用合并转发api实现";
    this.version = 1;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, message, tags) => {
        let find = tags.find(tag => tag.tagName === "xml");
        if (find === void 0) return;
        let data = find.get("data");
        if (data === void 0) return;
        let parse = CQAntiXML.parse(data, message.sender.nickname, message.user_id);
        if (parse === false) {
          bot.send_group_msg(message.group_id, [
            CQ.text("xml消息解析失败"),
          ]).catch(() => {});
        } else {
          bot.send_group_forward_msg(message.group_id, parse)
              .catch(() => {});
        }
      },
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
  }
  
  private static parse(data: string, name: string, uid: number): messageNode[] | false {
    let msg = new DOMParser().parseFromString(data, "text/xml").documentElement;
    if (msg === void 0) return false;
    let item = msg.getElementsByTagName("item").item(0);
    if (item === null) return false;
    let sourceElement = msg.getElementsByTagName("source").item(0);
    let source: CQTag<node>;
    if (sourceElement === null) {
      source = CQ.node(name, uid, "无具体来源");
    } else {
      source = CQ.node(name, uid, "来源:" + sourceElement.getAttribute("name"));
    }
    let title: string = item.getElementsByTagName("title")[0]?.firstChild?.nodeValue ?? "无标题";
    let summary: string = item.getElementsByTagName("summary")[0]?.firstChild?.nodeValue ?? "无摘要";
    let picture = item.getElementsByTagName("picture")[0]?.getAttribute("cover");
    let audioElement = item.getElementsByTagName("audio")[0];
    let audio: CQTag<node>[] = [];
    if (audioElement !== undefined) {
      let src = audioElement.getAttribute("src");
      audio = src ? [CQ.node(name, uid, "音频链接" + src)] : [];
      picture = audioElement.getAttribute("cover");
    }
    let brief = msg.getAttribute("brief");
    let url = msg.getAttribute("url");
    return [
      CQ.node(name, uid, "反xml卡片功能"),
      CQ.node(name, uid, `网页链接: ${this.url(url)}`),
      CQ.node(name, uid, picture ? [CQ.image(this.url(picture))] : "无图片"),
      ...audio,
      CQ.node(name, uid, [
        CQ.text(`外部消息显示: ${brief}\n标题: ${title}\n摘要: ${summary}`),
      ]),
      source,
    ];
  }
  
  private static url(url?: string | null) {
    return /^[^?]*/.exec(url ?? "")![0];
  }
}

export = new CQAntiXML();
