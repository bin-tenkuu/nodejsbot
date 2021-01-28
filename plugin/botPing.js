let Plugin = require("../Plugin");
let CQ = require("go-cqwebsocket").CQ;

class CQBotPing extends Plugin {
  constructor() {
    super({
      name: "QQ群@复读",
      description: "@复读",
      version: 0.5,
    });
  }
  
  install() {
    return super.install().then(() => {
      this.header = global.bot.bind("on", {
        "message.group": (event, context, tags) => {
          let bot = global.bot;
          // 没有@自己
          if (!tags.some(tag => tag["tagName"] === "at" && tag["qq"] === bot.qq)) {
            return;
          }
          // stopPropagation方法阻止事件冒泡到父元素
          event.stopPropagation();
          let groupId = context.group_id;
          let messageId = context["message_id"];
          let userId = context.sender.user_id;
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
            CQ.text(cqTags),
          ]).then(bot.messageSuccess, bot.messageFail);
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
}

module.exports = CQBotPing;