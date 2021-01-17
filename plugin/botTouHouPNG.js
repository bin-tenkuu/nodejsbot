const https = require("https");
let {Tags: {CQ}} = require("../src/websocket");

let Plugin = require("../Plugin");

module.exports = class CQBotTouHou extends Plugin {
  constructor() {
    super({
      name: "东方随机图片",
      description: "随机东方图",
      version: 0.1
    });
    this.header = (event, context, tags) => {
      this.randomPNG(event, context, tags)
    }
    this.isRandom = false;
  }

  install() {
    return super.install().then(() => {
      global.bot.on("message.group", this.header)
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.off("message.group", this.header)
      }
    })
  }

  randomPNG(event, context, tags) {
    // 在内部则退出
    switch (this.isRandom) {
      case true:
        return;
      case false:
        this.isRandom = true;
    }
    let cqTag = tags.find(tag => tag["tagName"] === "text");
    if (!cqTag) {
      return;
    }
    let text = cqTag["text"];
    if (/^东方图$/.test(text)) {
      console.log("开始东方");
      event.stopPropagation();
      let {
        group_id,
      } = context;
      bot.send_group_msg(group_id, [
        CQ.text("随机东方图加载中")
      ])
      this._paulzzhAPI().then(json => {
        console.log(json["url"])
        bot.send_group_msg(group_id, [
          CQ.image(json["url"])
        ])
      }).catch(err => {
        console.error(err)
        bot.send_group_msg(group_id, [
          CQ.text(`东方图API调用错误`)
        ])
      })
      setTimeout(() => {
        this.isRandom = false;
      }, 5000)
    } else {
      this.isRandom = false;
    }
  }

  async _paulzzhAPI() {
    return new Promise((resolve, reject) => {
      https.get("https://img.paulzzh.tech/touhou/random?type=json", res => {
        res.setEncoding("utf-8");
        let json = "";
        res.on("data", data => json += data)
        res.on("error", err => reject(err))
        res.on("end", () => resolve(json))
      })
    });
  }
}