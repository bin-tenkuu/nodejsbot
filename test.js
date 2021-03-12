const {CQ, CQWebSocket} = require("go-cqwebsocket");
const {cqws, adminId, adminGroup} = require("./out/configs/config.js");
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
  bot.send_group_msg(660996459, [
    CQ.replyC("自定义回复", 982809597),
    CQ.text("测试"),
  ]).catch(() => {

  });
  // bot.send_group_forward_msg(adminGroup, [
  //   CQ.node("name", "2938137849", [
  //     CQ.image("https://i.pximg.cat/img-original/img/2020/06/09/01/17/01/82194040_p0.jpg"),
  //   ]),
  // ]).catch(() => {
  //   console.log("发送失败");
  // });
  setTimeout(() => {
    bot.disconnect();
  }, 3000);
});


bot.connect();
