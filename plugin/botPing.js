let Plugin = require("../Plugin");
let {Tags: {CQ}} = require("../src/websocket");

class CQBotPing extends Plugin {
  constructor() {
    super({
      name: "QQ群@复读",
      description: "@复读",
      version: 0.2,
    });
  }

  install() {
    return super.install().then(() => {
      global.bot.on("message.group", this.ping)
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.off("message.group", this.ping)
      }
    })
  }

  /**
   *
   * @param event
   * @param context
   * @param {CQTag[]}tags
   */
  ping(event, context, tags) {
    let bot = global.bot;
    if (!tags.some(tag => tag["tagName"] === "at" && tag["qq"] === bot.qq)) {
      return;
    }
    // stopPropagation方法阻止事件冒泡到父元素
    event.stopPropagation();
    let groupId = context.group_id;
    let messageId = context["message_id"];
    let userId = context.sender.user_id;
    /**
     * @type {string}
     */
    let cqTags = tags.filter(tag => tag["tagName"] === "text")
        .map(tag => tag["text"]).join("")
        .replace(/吗/g, "")
        .replace(/不/g, "很")
        .replace(/你/g, "我")
        .replace(/(?<!没)有/g, "没有")
        .replace(/\?？/g, "!");
    bot.send_group_msg(groupId, [
      CQ.reply(messageId),
      CQ.at(userId),
      CQ.text(cqTags)
    ])
  }
}

module.exports = CQBotPing;