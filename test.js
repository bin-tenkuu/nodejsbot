const {CQ, CQWebSocket} = require("go-cqwebsocket");
const {cqws, adminId} = require("./config/config.json");
let bot = new CQWebSocket(cqws);
bot.once("socket.open", (event, message) => {
  let msg = bot.bind("onceAll", {
    "socket.open": () => {
      clearTimeout(timeout);
      bot.send_private_msg(adminId, "已上线");
    },
  });
  let timeout = setTimeout(() => {
    msg["socket.open"]?.(event, message);
  }, 5000);
  bot.once("socket.close", () => {
    console.log("下线");
  });
});

bot.on("message.private", (event, message, tags) => {
  console.log("收到消息");
  console.log(message.message);
  console.log(tags);
  setTimeout(() => {
    bot.disconnect();
  }, 3000);
});

// bot.on("notice.group_recall", (event, message) => {
//   bot.send_group_forward_msg(message.group_id, [
//     CQ.nodeId(message.message_id),
//   ]).then(bot.messageSuccess, bot.messageFail);
//   setTimeout(() => {
//     bot.disconnect();
//   }, 5000);
// });

bot.connect();
