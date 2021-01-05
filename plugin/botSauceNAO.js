let Plugin = require("../Plugin");
const CQ = require("../src/CQ")
const NAO = require("../src/SauceNAOUtil");
let {admin, success, fail} = require("../src/utils");

class CQBotSauceNAO extends Plugin {
  constructor() {
    super({
      name: "QQ私聊搜图",
      description: "QQ私聊SauceNAO搜图",
      version: 0.1,
      require: ["CQBot"]
    });
    this.header = (event, context, tags) => {
      this.search(event, context, tags)
    }
  }

  install() {
    return super.install().then(() => {
      global.bot.on("message.private", this.header)
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.off("message.private", this.header)
      }
    })
  }

  search(event, context, tags) {
    console.log("收到消息", context, tags);

    let bot = global.bot;
    for (let tag of tags) {
      if (tag.tagName !== "image") {
        continue;
      }
      let url = tag.url;
      if (url == null) {
        continue;
      }
      let userId = context.user_id;
      console.log("开始搜图");
      NAO.search(url, {
        testmode: 1,
        numres: 1,
      }).then(result => {
        if (result.hasResult) {
          let first = result.results[0];
          console.log("有结果", first);
          bot.send(
              "send_private_msg",
              admin([
                CQ.image(first.thumbnail),
                CQ.text(`相似度: ${first.similarity}%\n`),
                CQ.text(`具体信息已舍弃`)
                //TODO:作者&图片源&标题
              ], userId)
          ).then(success, fail)
        } else {
          console.log("搜图无结果");
          bot.send(
              "send_private_msg",
              admin([
                CQ.text(`搜图无结果`)
              ], userId)
          ).then(success, fail)
        }
      }).catch((err) => {
        console.log("搜图出错");
        console.error(err);
        bot.send(
            "send_private_msg",
            admin([
              CQ.text(`搜图出错`)
            ], userId)
        ).then(success, fail);
      })

      event.stopPropagation();
      break;
    }
  }
}

module.exports = CQBotSauceNAO;