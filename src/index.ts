import fs from "fs";
import Plug from "./Plug";

declare namespace NodeJS {
  interface Require {
    (id: string): { default?: Plug } & any;
  }
}

let files = fs.readdirSync((`${module.path}/plugs`), "utf-8");
for (let file of files) {
  let plug = require(`./plugs/${file}`).default;
  if (!(plug instanceof Plug)) {
    console.error(file);
  }
}
Promise.resolve().then(() => {
  return require("./plugs/httpOption").default.install();
}).then(() => {
  return require("./plugs/bot").default.install();
}).then(() => {
  return require("./plugs/botPlugin").default.install();
}).then(() => {
  module.children = [];
});


