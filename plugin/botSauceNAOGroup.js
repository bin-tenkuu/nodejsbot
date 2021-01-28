let Plugin = require("../Plugin");
let CQ = require("go-cqwebsocket").CQ;
const NAO = require("../src/SauceNAOUtil");

module.exports = class CQBotSauceNAOGroup extends Plugin {
  constructor() {
    super({
      name: "QQ群聊搜图",
      description: "QQ群聊SauceNAO搜图",
      version: 0.1,
    });
  }
  
  install() {
    return super.install().then(() => {
      this.header = global.bot.bind("on", {
        "message.group": (event, context, tags) => {
          let bot = global.bot;
          let cqText = tags.find(value => value.tagName === "text");
          if (!/^\/搜图/.exec(cqText?.["text"])) {
            return;
          }
          for (let tag of tags) {
            if (tag.tagName !== "image") {
              continue;
            }
            let url = tag.url;
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
            NAO.search(url, {
              testmode: 1,
              numres: 1,
            }).then(result => {
              if (result.hasResult) {
                console.log("有结果"/*, result*/);
                let [first, second, third] = result.results;
                bot.send_group_forward_msg(group_id, [
                  CQ.nodeId(message_id),
                  CQ.node(nickname, user_id, [
                    CQ.image(CQ.escape(first.thumbnail, true)),
                    CQ.text(`相似度: ${first.similarity}%\n`),
                    CQ.text(CQ.escape(this.decodeData(first.index_id, first.data), true)),
                  ].join("")),
                  CQ.node(nickname, user_id, [
                    CQ.image(CQ.escape(second.thumbnail, true)),
                    CQ.text(`相似度: ${second.similarity}%\n`),
                    CQ.text(CQ.escape(this.decodeData(second.index_id, second.data), true)),
                  ].join("")),
                  CQ.node(nickname, user_id, [
                    CQ.image(CQ.escape(third.thumbnail, true)),
                    CQ.text(`相似度: ${third.similarity}%\n`),
                    CQ.text(CQ.escape(this.decodeData(third.index_id, third.data), true)),
                  ].join("")),
                ]).then(bot.messageSuccess, bot.messageFail);
              } else {
                console.log("搜图无结果");
                bot.send_group_msg(group_id, [
                  CQ.reply(message_id),
                  CQ.at(user_id),
                  CQ.text(`搜图无结果`),
                ]).then(bot.messageSuccess, bot.messageFail);
              }
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
    });
  }
  
  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.unbind(this.header);
      }
    });
  }
  
  /**
   * 解析部分数据
   * @param {number}index
   * @param {*}data
   * @return {string}
   */
  decodeData(index, data) {
    let title;
    let url = data["ext_urls"];
    switch (index) {
      case 5:
        return `图库:Pixiv\n标题:${data.title}\n画师:${data["member_name"]}\n原图:www.pixiv.net/artworks/${data["pixiv_id"]}`;
      case 19:
        return `图库:2D市场\n上传者:${data["creator"]}原图:${url[0]}`;
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
        return `图库:Twitter\n上传者:${data["twitter_user_handle"]}原图:${url[0]}`;
      default:
        return `图库id:${index}\n具体信息未解析`;
    }
  }
};
