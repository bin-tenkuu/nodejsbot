const $get = require('lodash.get')

let a = {
  a: {
    "": 2,
    "b": {
      "": 1,
      c: 0
    }
  }
}

let split = "a.b.c".split(".");
let arr = $get(a, split);
split.push("")
for (; split.length > 1;
       split.pop(), split.pop(), split.push(""), arr = $get(a, split)
) {
  console.log(arr)
}
