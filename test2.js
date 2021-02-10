const axios = require("axios").create({});

axios.get("https://www.pixiv.net/artworks/56770644").then(html => {
  console.log(html);
});