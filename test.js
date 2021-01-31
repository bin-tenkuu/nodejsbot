const axios = require("axios").create({
  timeout: 10000,
});

axios.get("https://img.paulzzh.tech/touhou/random", {
  params: {
    type: "json",
  },
}).then(r => {
  console.log(r.data);
});