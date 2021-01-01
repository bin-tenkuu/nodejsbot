const {cqws, adminId} = require("./config/config.json");
const utils = require('./src/utils');
const CQ = require("./src/CQ")
const Repeat = require("./src/repeat");
const NAO = require("./src/SauceNAOUtil");

function admin(message) {
  return {
    user_id: adminId,
    message: message
  }
}

function success(ret) {
  console.log(`发送成功`, ret.data);
}

function fail(reason) {
  console.log(`发送失败`, reason);
}


const bot = utils.openCQWebSocket(cqws);
const repeat = new Repeat();


bot.on("message.private", (event, context, tags) => {
  console.log(event);
  console.log(context);
  console.log(tags);

  console.log("收到消息", context, tags);
  for (let tag of tags) {
    if (tag.tagName === "image") {
      let url = tag.url;
      if (url) {
        console.log("开始搜图");
        NAO.search(url, {
          testmode: 1,
          db: 5,
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
                  //TODO:作者&图片源
                ])
            ).then(success, fail)
          } else {
            console.log("搜图无结果");
            bot.send("send_private_msg", admin([
                  CQ.text(`搜图无结果`)
                ])
            ).then(success, fail)
          }
        })
      }
      // stopPropagation方法阻止事件冒泡到父元素
      event.stopPropagation()
      break;
    }
  }

});

bot.on("message.group.@.me", (event, context, tags) => {
  let groupId = context.group_id;
  let messageId = context.message_id;
  let userId = context.sender.user_id;
  /**
   * @type {[]}
   */
  let cqTags = tags.filter(tag => tag.tagName === "text");

  // stopPropagation方法阻止事件冒泡到父元素
  event.stopPropagation()

  bot.send("send_group_msg", {
    group_id: groupId,
    message: [
      CQ.reply(messageId),
      CQ.at(userId),
      ...cqTags
    ]
  }).then(success, fail)
})

bot.on("message.group", (event, context, tags) => {
  let groupId = context.group_id;
  // let messageId = context.message_id;
  let userId = context.sender.user_id;

  if (tags.length === 1 && tags[0].tagName === "text") {
    let msg = tags[0].text;
    if (msg.startsWith("-")) {
      // TODO: 命令行指令
    } else {
      if (repeat.check(groupId, userId, msg, 3)) {
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
})


//////////////////////////////////////////////////////////
// 开始
//////////////////////////////////////////////////////////
bot.connect();
utils.httpStop(() => {
  return bot.send('send_private_msg', admin("即将下线")).then(ret => {
    console.log("发送成功", ret.data);
    bot.disconnect();
  }).catch(() => {
    console.log("发送超时");
    bot.disconnect();
  });
})


module.exports = {
  bot
};