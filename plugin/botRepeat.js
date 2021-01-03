let Plugin = require("../Plugin");
const utils = require('../src/utils');
const Repeat = require("../src/repeat");

function success(ret) {
  console.log(`${utils.now()} 发送成功`, ret.data);
}

function fail(reason) {
  console.log(`${utils.now()} 发送失败`, reason);
}

class BotRepeat extends Plugin {
  constructor() {
    super({
      id: "CQBotRepeat",
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
        throw "CQBot 未加载";
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