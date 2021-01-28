// const FormData = require('form-data')
// const https = require("https");
//
// let form = new FormData()
//
// form.append("type", "json");
// (async () => {
//   let json = await new Promise((resolve, reject) => {
//     https.get("https://img.paulzzh.tech/touhou/random?type=json&tag=mokou", res => {
//       res.setEncoding("utf-8");
//       res.on("data", data => resolve(JSON.parse(data)))
//       res.on("error", err => reject(err))
//     })
//   });
//   console.log(json);
// })();
const {cqws} = require("./config/config.json");
const utils = require("./src/utils");
let {CQWebSocket, CQ} = require("go-cqwebsocket");
/**
 *
 * @type {CQWebSocket}
 */
let bot = utils.openCQWebSocket(cqws);
bot.connect();
bot.on("api.preSend", (event, message) => {
  console.log(message);
  console.log(JSON.stringify(message.params));
});
bot.once("socket.open", (_) => {
  setTimeout(() => {
    bot.send_group_msg(660996459, [
      CQ.tts("亚亚没有牛子"),
    ]).then(() => {
      setTimeout(() => {
        bot.disconnect();
      }, 5000);
    }, bot.messageFail);
    
  }, 1000);
});
