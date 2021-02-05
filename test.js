const {CQ, CQWebSocket} = require("go-cqwebsocket");
const {cqws, adminId} = require("./config/config.json");
let bot = new CQWebSocket(cqws);
bot.once("socket.open", (event, message) => {
  let msg = bot.bind("onceAll", {
    "socket.open": () => {
      clearTimeout(timeout);
      bot.send_private_msg(2938137849, "已上线");
    },
  });
  let timeout = setTimeout(() => {
    msg["socket.open"]?.(event, message);
  }, 5000);
});
bot.on("message.private", (event, message, CQTag) => {
  console.log(message.message);
  console.log(CQTag);
  bot.disconnect();
});

bot.connect();
