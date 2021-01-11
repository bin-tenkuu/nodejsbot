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
    this.header = (event, context, tags) => {
      this.repeat(event, context, tags)
    }
    this.body = new Repeat()
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

  repeat(event, context, tags) {
    let groupId = context.group_id;
    // let messageId = context.message_id;
    let userId = context.sender.user_id;

    if (tags.length > 1 || tags[0].tagName !== "text") {
      return;
    }
    let msg = tags[0].text;
    // if (msg.startsWith("-")) {
    //   return;
    // }
    if (!this.body.check(groupId, userId, msg, 3)) {
      return;
    }
    event.stopPropagation();
    let bot = global.bot;
    bot.send_group_msg(groupId, tags[0])
  }
}

module.exports = BotRepeat;