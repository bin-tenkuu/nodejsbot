let Plugin = require("../Plugin");
const Repeat = require("../src/repeat");

class BotRepeat extends Plugin {
  constructor() {
    super({
      name: "QQ机器人-复读",
      description: "测试用",
      version: 0.1
    });
    this.header = new Repeat()
  }

  install() {
    return super.install().then(() => {
      let bot = global.bot;
      if (!bot) {
        throw "出错";
      } else {
        bot.on("message.group", this.repeat)
      }
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      console.log(this.toString())
    })
  }

  repeat(event, context, tags) {
    let groupId = context.group_id;
    // let messageId = context.message_id;
    let userId = context.sender.user_id;

    if (tags.length === 1 && tags[0].tagName === "text") {
      let msg = tags[0].text;
      if (!msg.startsWith("-")) {
        if (this.header.check(groupId, userId, msg, 3)) {
          setTimeout(() => {
            bot.send("send_group_msg", {
              group_id: groupId,
              message: [
                tags[0]
              ]
            }).then(success, fail)
          }, 1000)
        }
      }
    }
  }
}

module.exports = BotRepeat;