import {CQ, CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";

import {sauceNAO} from "../utils/Search";

class CQBotSauceNAOGroup extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ群聊搜图";
    this.description = "QQ群聊SauceNAO搜图";
    this.version = 0.1;
  }
  
  async install() {
    let def = require("./bot").default;
    if (!def.bot) return;
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, context, tags) => {
        let cqText = tags.find(value => value.tagName === "text");
        if (!/^\/搜图/.exec(cqText?.get("text"))) {
          return;
        }
        for (let tag of tags) {
          if (tag.tagName !== "image") {
            continue;
          }
          let url = tag.get("url");
          if (url == null) {
            continue;
          }
          let {
            group_id,
            message_id,
            user_id,
            sender: {
              nickname,
            },
          } = context;
          
          console.log("开始搜图");
          sauceNAO(url).then(result => {
            console.log(result);
            if (result.results.length === 0) {
              console.log("搜图无结果");
              bot.send_group_msg(group_id, [
                CQ.reply(message_id),
                CQ.at(user_id),
                CQ.text(`搜图无结果`),
              ]).then(bot.messageSuccess, bot.messageFail);
              return;
            }
            bot.send_group_msg(group_id, [
              CQ.reply(message_id),
              CQ.at(user_id),
              CQ.text("有结果，加载中"),
            ]).then(bot.messageSuccess, bot.messageFail);
            let [first, second, third] = result.results;
            bot.send_group_forward_msg(group_id, [
              CQ.nodeId(message_id),
              CQ.node(nickname, user_id, [
                CQ.image(first.header.thumbnail),
                CQ.text(`相似度: ${first.header.similarity}%\n`),
                CQ.text(this.decodeData(first.header.index_id, first.data)),
              ]),
              CQ.node(nickname, user_id, [
                CQ.image(second.header.thumbnail),
                CQ.text(`相似度: ${second.header.similarity}%\n`),
                CQ.text(this.decodeData(second.header.index_id, second.data)),
              ]),
              CQ.node(nickname, user_id, [
                CQ.image(third.header.thumbnail),
                CQ.text(`相似度: ${third.header.similarity}%\n`),
                CQ.text(this.decodeData(third.header.index_id, third.data)),
              ]),
            ]).then(bot.messageSuccess, reason => {
              bot.messageFail(reason);
              bot.send_group_msg(message_id, [
                CQ.reply(message_id),
                CQ.at(user_id),
                CQ.text("加载失败或发送失败"),
              ]);
            });
            
          }).catch((err) => {
            console.log("搜图出错");
            console.error(err);
            bot.send_group_msg(group_id, [
              CQ.reply(message_id),
              CQ.at(user_id),
              CQ.text(`搜图出错`),
            ]).then(bot.messageSuccess, bot.messageFail);
          });
          
          event.stopPropagation();
          break;
        }
      },
    });
  }
  
  async uninstall() {
    let def = require("./bot").default;
    def.bot?.unbind(this.header);
  }
  
  /**
   * 解析部分数据
   * @param {number}index
   * @param {*}data
   * @return {string}
   */
  decodeData(index: number, data: any) {
    let title;
    let url = data["ext_urls"];
    switch (index) {
      case 5:
        return `图库:Pixiv\n标题:${data.title}\n画师:${data["member_name"]}\n原图:www.pixiv.net/artworks/${data["pixiv_id"]}`;
      case 9:
        return `图库:Danbooru\n上传者:${data["creator"]}\n角色:${data["characters"]}\n原图:${data["source"]}`;
      case 19:
        return `图库:2D市场\n上传者:${data["creator"]}\n原图:${url[0]}`;
      case 31:
        return `图库:半次元插图\n标题:${data.title}\n画师:${data["member_name"]}\n原图:${url[0]}`;
      case 34:
        return `图库:deviantart\n标题:${data.title}\n画师:${data["author_name"]}\n原图:${url[0]}`;
      case 36:
        return `图库:madokami\n无具体信息`;
      case 37:
        return `图库:露娜汉化\n画师:${data["author"]}\n原图`;
      case 38:
        title = data["jp_name"] | data["eng_name"] | data.source;
        url = data["creator"].toString();
        return `图库:ehentai\n标题:${title}\n创建者:${url}`;
      case 41:
        return `图库:Twitter\n上传者:${data["twitter_user_handle"]}\n原图:${url[0]}`;
      default:
        return `图库id:${index}\n具体信息未解析`;
    }
  }
}

export default new CQBotSauceNAOGroup();
