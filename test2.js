let axios = require("axios").create({timeout: 1000 * 10});

function get(pid) {
  return axios.get(`https://pixiv.cat/${pid}.png`).then(value => {
    return (value.headers["x-origin-url"]).replace("i.pximg.net", "i.pixiv.cat");
  });
}

get(`82775556-1`).then(str => {
  console.log(str);
}).catch((reason) => {
  console.log(reason.response.data);
  let exec = /(?<=<p>)[^<]+/.exec(reason.response.data)?.[0];
  console.log(exec);
});
