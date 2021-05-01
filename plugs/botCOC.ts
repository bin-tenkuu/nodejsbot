import {CQ, CQEvent} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {dice} from "../utils/COCUtils";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {onlyText} from "../utils/Util";

export = new class CQBotCOC extends Plug {
  static shortKey = new Map<string, string>();
  
  constructor() {
    super(module);
    this.name = "QQ群聊-COC跑团相关";
    this.description = "一些跑团常用功能";
    this.version = 1;
    
  }
  
  async install() {
    let botGroup = require("./bot");
    botGroup.getGroup(this).push((event: CQEvent<"message.group">) => {
      let text = onlyText(event);
      if (!/^\.d/.test(text)) return;
      if (/^\.d /.test(text)) {
        return CQBotCOC.execDice(event);
      } else if (/\.dset /.test(text)) {
        return CQBotCOC.execDiceSet(event);
      } else if (/\.dstat/.test(text)) {
        return CQBotCOC.execDiceStat(event);
      }
    });
    botGroup.setGroupHelper("跑团骰子", [CQ.text(`.d (表达式) 其他
    .dset key[=value] 设置/删除简写
    .dstat 查看简写列表`)]);
    CQBotCOC.readShortKey();
  }
  
  async uninstall() {
    let botGroup = require("./bot");
    botGroup.delGroup(this);
    botGroup.delGroupHelper("跑团骰子");
  }
  
  private static readShortKey() {
    db.start(async db => {
      db.all<{ key: string, value: string }[]>(`select key, value from COCShortKey`).then((kvs) => {
        kvs.forEach(({key, value}) => CQBotCOC.shortKey.set(key, value));
      });
    }).catch(NOP);
  }
  
  private static execDiceSet(event: CQEvent<"message.group">) {
    let dice = /^\.dset +(?<key>\w[\w\d]+)(?:=(?<value>[+\-*d0-9#]+))?/.exec(onlyText(event));
    let groupId = event.context.group_id;
    if (dice === null) {
      event.bot.send_group_msg(groupId, ".dset 参数错误").catch(NOP);
      return;
    }
    let {key, value} = dice.groups as { key?: string, value?: string };
    if (key === undefined || key.length > 5) return;
    if (value === undefined) {
      db.start(async db => {
        await db.run(`delete from COCShortKey where key = ?`, key);
      }).then(NOP);
      this.shortKey.delete(key);
      event.bot.send_group_msg(groupId, `删除key:${key}`).catch(NOP);
      return;
    }
    if (value.length > 10) return;
    this.shortKey.set(key, value);
    db.start(async db => {
      await db.run(`insert into COCShortKey(key, value) values (?, ?)`, key, value);
    }).then(NOP);
    event.bot.send_group_msg(groupId, `添加key:${key}=${value}`).catch(NOP);
  }
  
  private static execDiceStat(event: CQEvent<"message.group">) {
    let str = "";
    this.shortKey.forEach((value, key) => {
      str += `${key}=${value}\n`;
    });
    event.bot.send_group_msg(event.context.group_id, str);
  }
  
  private static execDice(event: CQEvent<"message.group">) {
    let dice = /^\.d +([^ ]+)/.exec(onlyText(event))?.[1].toString();
    if (dice === undefined) {
      return;
    }
    event.stopPropagation();
    this.shortKey.forEach((value, key) => {
      dice = (<string>dice).replace(new RegExp(key), value);
    });
    if (/[^+\-*d0-9#]/.test(dice)) {
      event.bot.send_group_msg(event.context.group_id, ".d错误参数").catch(NOP);
      return;
    }
    event.bot.send_group_msg(event.context.group_id, CQBotCOC.dice(dice)).catch(NOP);
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
        let dices = dice(num, +groups.max);
        return {
          origin: value,
          op,
          ...dices,
        };
      } else {
        return {
          op: op,
          num: num,
        };
      }
    });
    
    let preRet = handles.filter(v => v.list).map((v) => {
      return `${v.origin}：[${v.list!.join()}]=${v.num}\n`;
    }).join("");
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
          logger.info(op);
          return sum;
        }
      }
    }, 0);
    return `${preRet}${str}=${sumNum}`;
  }
}
