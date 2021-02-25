import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";
import {lolicon} from "../utils/Search";

class CQBotLoLiSeTu extends Plug {
  private header?: SocketHandle;
  private isCalling: boolean;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-色图";
    this.description = "QQ群聊发送合并转发色图";
    this.version = 0;
    this.isCalling = false;
  }
  
  async install() {
    let def = require("./bot");
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, message, tags) => {
        if (tags.length !== 1 || tags[0].tagName !== "text") {
          return;
        }
        // "^竹竹.*[来來发發给給][张張个個幅点點份]?(?<r18>[Rr]18的?)?(?<keyword>.*?)?的?[色瑟][图圖]|^--setu$"
        let exec = /^[来來][张張点點份](?<r18>[Rr]18的?)?(?<keyword>.*?)?的?[色瑟][图圖]/.exec(tags[0].get("text"));
        if (exec == null) {
          return;
        }
        
        let groups = {
          r18: exec.groups?.r18 !== undefined,
          keyword: exec.groups?.keyword,
        };
        if (this.isCalling) {
          return;
        } else {
          this.isCalling = true;
        }
        console.log("开始色图", groups);
        let groupId = message.group_id;
        lolicon(groups.keyword, groups.r18).then(value => {
          if (value.code !== 0) {
            bot.send_group_msg(groupId, CQBotLoLiSeTu.code(value.code)).catch(() => {});
            this.isCalling = false;
            return;
          }
          if (value.count < 1) {
            bot.send_group_msg(groupId, "色图数量不足").catch(() => {});
            this.isCalling = false;
            return;
          }
          let first = value.data[0];
          console.log(`剩余次数：${value.quota}||推荐延时：${value.quota_min_ttl}s`);
          bot.send_group_msg(groupId, "开始加载").then(loadId => {
            let nickname = message.sender.nickname;
            let userId = message.user_id;
            bot.send_group_forward_msg(groupId, [
              CQ.nodeId(message.message_id),
              CQ.node(nickname, userId, `标题：${first.title}
作者：${first.author}
原图：www.pixiv.net/artworks/${first.pid}`),
              CQ.node(nickname, userId, [CQ.image(first.url)]),
              CQ.node(nickname, userId, first.tags.join("\n")),
            ]).then(picId => {
              bot.delete_msg(loadId.message_id).catch(() => {});
              setTimeout(() => {
                let unlock = () => {
                  this.isCalling = false;
                  console.log("解除锁定 %s", this.name);
                };
                bot.delete_msg(picId.message_id).catch(() => {});
                if (value.quota >= 1) {
                  unlock();
                } else {
                  setTimeout(unlock, 1000 * Number(value.quota_min_ttl));
                }
              }, 1000 * 60);
            }).catch(() => {});
          }).catch(() => {});
        }).catch(reason => {
          bot.send_group_msg(groupId, "未知错误").catch(() => {});
          console.log(reason);
        });
      },
    });
  }
  
  async uninstall() {
    let def = require("./bot");
    def._bot?.unbind(this.header);
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

export = new CQBotLoLiSeTu();
