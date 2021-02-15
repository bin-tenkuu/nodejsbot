import {CQWebSocket} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";
import * as COC from "../utils/COCUtils";

class CQBotCOC extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-COC跑团相关";
    this.description = "一些跑团常用功能";
    this.version = 1;
  }
  
  async install() {
    let def = require("./bot");
    if (!def.bot) return;
    let bot: CQWebSocket = def.bot;
    this.header = bot.bind("on", {
      "message.group": (event, message, tags) => {
        if (tags.length !== 1 || tags[0].tagName !== "text") {
          return;
        }
        let dice = /^\.d +(\S.*)$/.exec((tags[0].get("text") as string))?.[1].replace(
          / +/g,
          "",
        );
        if (!dice) { return; }
        if (/[^+\-*d0-9]/.test(dice)) {
          bot.send_group_msg(message.group_id, "/d错误参数").then(bot.messageSuccess, bot.messageFail);
          return;
        }
        dice = CQBotCOC.dice(dice);
        bot.send_group_msg(message.group_id, dice).then(bot.messageSuccess, bot.messageFail);
      },
    });
  }
  
  async uninstall() {
    let def = require("./bot");
    def.bot?.unbind(this.header);
  }
  
  private static dice(str: string): string {
    let handles = str.split(/(?=[+\-*])/).map<{
      op: "+" | "-" | "*"
      num: number
      list?: number[]
      origin?: string
    }>(value => {
      let groups = (/^(?<op>[+\-*])?(?<num>\d+)?(d(?<max>\d+))?$/.exec(value)?.groups ?? {}) as {
        op?: "+" | "-" | "*"
        num?: string
        max?: string
      };
      let num: number | number[] = +(groups.num ?? 1);
      let op = groups.op ?? "+";
      if (groups.max) {
        let dice = COC.dice(num, +groups.max);
        return {
          origin: value,
          op,
          ...dice,
        };
      } else {
        return {
          op: op,
          num: num,
        };
      }
    });
    
    let preRet = handles.filter(v => v.list).map((v) => {
      return `${v.origin}：[${v.list!.join()}]=${v.num}`;
    }).join("\n");
    let cache = 1;
    let sumNum = handles.reduceRight<number>((sum, v) => {
      switch (v.op) {
        case "*": {
          cache *= v.num;
          return sum;
        }
        case "+": {
          let number = v.num * cache;
          cache = 1;
          return sum + number;
        }
        case "-": {
          let number = v.num * cache;
          cache = 1;
          return sum - number;
        }
        default: {
          let op: never = v.op;
          console.log(op);
          return sum;
        }
      }
    }, 0);
    return `${preRet}\n${str}=${sumNum}`;
  }
}

export = new CQBotCOC();
