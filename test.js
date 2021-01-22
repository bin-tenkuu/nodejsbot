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
let {CQWebSocket} = require("go-cqwebsocket");
/**
 *
 * @type {CQWebSocket}
 */
let bot = utils.openCQWebSocket(cqws);
bot.connect();
bot.once("socket.open", () => {
  setTimeout(() => {
    console.log("发送");
    // bot.get_msg(-543165377).then(value => {
    //   console.log(value);
    // });


    setTimeout(() => {
      bot.disconnect();
    }, 15000);
  }, 2000);
});
