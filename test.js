const FormData = require('form-data')
const https = require("https");

let form = new FormData()

form.append("type", "json");
(async () => {
  let json = await new Promise((resolve, reject) => {
    https.get("https://img.paulzzh.tech/touhou/random?type=json&tag=mokou", res => {
      res.setEncoding("utf-8");
      res.on("data", data => resolve(JSON.parse(data)))
      res.on("error", err => reject(err))
    })
  });
  console.log(json);
})();
