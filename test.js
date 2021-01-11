let {Tags: {CQTag, CQAt}} = require("./src/websocket");


let text = "CQ:at,qq=2506019369";

let array = text.match(/^CQ:([a-z]+)(,[^,]+)*$/);

let map = array[2].split(",").filter((_, i) => i > 0).map(v => v.split("="));
let entries = Object.fromEntries(map);
let cqTag = new CQTag(array[1], entries);

let coerce = Object.setPrototypeOf(cqTag, CQAt.prototype).coerce();

console.log(coerce)