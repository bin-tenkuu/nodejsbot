let Plugin = require("../Plugin");
const Repeat = require("../src/repeat");

class BotRepeat extends Plugin {
  constructor() {
    super({
      id: "CQBotRepeat",
      name: "QQ机器人-复读",
      description: "测试用",
      version: 0.1,
    });
  
    this.body = new Repeat();
  }
  
  install() {
    return super.install().then(() => {
      this.header = global.bot.bind("on", {
        "message.group": (event, context, tags) => {
          if (tags.length > 1 || tags[0].tagName !== "text") {
            return;
          }
          let msg = tags[0].text;
          if (msg.startsWith("/")) {
            return;
          }
          let groupId = context.group_id;
          let userId = context.user_id;
          if (!this.body.check(groupId, userId, msg, 3)) {
            return;
          }
          event.stopPropagation();
          let bot = global.bot;
          bot.send_group_msg(groupId, tags[0]).then(bot.messageSuccess, bot.messageFail);
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

module.exports = BotRepeat;