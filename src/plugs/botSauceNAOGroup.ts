import {CQ} from "go-cqwebsocket";
import {CQTag, image} from "go-cqwebsocket/out/tags";
import Plug from "../Plug";
import {logger} from "../utils/logger";

import {sauceNAO} from "../utils/Search";
import {GroupEvent} from "../utils/Util";

class CQBotSauceNAOGroup extends Plug {
  
  constructor() {
    super(module);
    this.name = "QQ群聊-搜图";
    this.description = "QQ群聊SauceNAO搜图";
    this.version = 0.1;
  }
  
  async install() {
    require("./botGroup").get(this).push((event: GroupEvent) => {
      if (!/^\.搜图/.test(event.text)) {
        return;
      }
      let tag: CQTag<image> | undefined = event.tags.find(tag => tag.tagName === "image");
      if (tag === undefined) {
        return;
      }
      let url = tag.get("url");
      if (url === undefined) {
        return;
      }
      logger.info("开始搜图");
      let {
        bot: bot,
        context: {
          group_id: groupId,
          message_id: messageId,
          user_id: userId,
          sender: {
            nickname: nickName,
          },
        },
      } = event;
      sauceNAO(url).then(result => {
        // console.log(result);
        if (result.results.length === 0) {
          logger.info("搜图无结果");
          bot.send_group_msg(groupId, [
            CQ.reply(messageId),
            CQ.at(userId),
            CQ.text(`搜图无结果`),
          ]).catch(() => {});
          return;
        }
        bot.send_group_msg(groupId, [
          CQ.reply(messageId),
          CQ.at(userId),
          CQ.text("有结果，加载中"),
        ]).catch(() => {});
        let [first, second, third] = result.results;
        bot.send_group_forward_msg(groupId, [
          CQ.nodeId(messageId),
          CQ.node(nickName, userId, [
            CQ.image(first.header.thumbnail),
            CQ.text(`相似度: ${first.header.similarity}%\n`),
            CQ.text(this.decodeData(first.header.index_id, first.data)),
          ]),
          CQ.node(nickName, userId, [
            CQ.image(second.header.thumbnail),
            CQ.text(`相似度: ${second.header.similarity}%\n`),
            CQ.text(this.decodeData(second.header.index_id, second.data)),
          ]),
          CQ.node(nickName, userId, [
            CQ.image(third.header.thumbnail),
            CQ.text(`相似度: ${third.header.similarity}%\n`),
            CQ.text(this.decodeData(third.header.index_id, third.data)),
          ]),
        ]).catch(() => {
          bot.send_group_msg(messageId, [
            CQ.reply(messageId),
            CQ.at(userId),
            CQ.text("加载失败或发送失败"),
          ]).catch(() => {});
        });
      }).catch((err) => {
        logger.warn("搜图出错");
        logger.error(err);
        bot.send_group_msg(groupId, [
          CQ.reply(messageId),
          CQ.at(userId),
          CQ.text(`搜图出错`),
        ]).catch(() => {});
      });
      event.stopPropagation();
    });
  }
  
  async uninstall() {
    require("./botGroup").del(this);
  }
  
  /**
   * 解析部分数据
   * @param {number}index
   * @param {*}data
   * @return {string}
   */
  decodeData(index: number, data: any) {
    let title: string;
    let url: string = data["ext_urls"]?.join("\n") ?? "无";
    switch (index) {
      case 5:
        return `图库:Pixiv\n标题:${data.title}\n画师:${data["member_name"]}\n原图:www.pixiv.net/artworks/${data["pixiv_id"]}`;
      case 9:
        return `图库:Danbooru\n上传者:${data["creator"]}\n角色:${data["characters"]}\n原图:${data["source"]}`;
      case 19:
        return `图库:2D市场\n上传者:${data["creator"]}\n原图:${url}`;
      case 31:
        return `图库:半次元插图\n标题:${data.title}\n画师:${data["member_name"]}\n原图:${url}`;
      case 34:
        return `图库:deviantart\n标题:${data.title}\n画师:${data["author_name"]}\n原图:${url}`;
      case 36:
        return `图库:madokami\n无具体信息`;
      case 37:
        return `图库:露娜汉化\n画师:${data["author"]}\n原图:${url}`;
      case 38:
        title = data["jp_name"] ?? data["eng_name"] ?? data.source;
        url = data["creator"].toString();
        return `图库:ehentai\n标题:${title}\n创建者:${url}`;
      case 41:
        return `图库:Twitter\n上传者:${data["twitter_user_handle"]}\n原图:${url}`;
      default:
        logger.info(index, data);
        return `图库id:${index}\n具体信息未解析\n链接:${url}`;
    }
  }
}

export = new CQBotSauceNAOGroup();
