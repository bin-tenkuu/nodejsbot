import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {dice, distribution} from "../utils/COCUtils.js";
import {db} from "../utils/database.js";
import {logger} from "../utils/logger.js";

class CQBotCOC extends Plug {
  shortKey = new Map<string, string>();
  cheater: boolean;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-COC跑团相关";
    this.description = "一些跑团常用功能";
    this.version = 1;
    this.cheater = false;
    
    this.readShortKey();
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getDiceStat(event: CQEvent<"message.group"> | CQEvent<"message.private">): Promise<CQTag[]> {
    event.stopPropagation();
    let str = "";
    this.shortKey.forEach((value, key) => {
      str += `${key}=${value}\n`;
    });
    if (str === "") str = "无";
    return [CQ.text(str)];
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getDiceSet(event: CQEvent<"message.group"> | CQEvent<"message.private">,
      execArray: RegExpExecArray): Promise<CQTag[]> {
    event.stopPropagation();
    let {key, value} = execArray.groups as { key?: string, value?: string } ?? {};
    if (key === undefined || key.length > 5) return [CQ.text("key格式错误或长度大于5")];
    if (value === undefined) {
      db.start(async db => {
        await db.run(`delete from COCShortKey where key = ?`, key);
        await db.close();
      }).catch(NOP);
      this.shortKey.delete(key);
      return [CQ.text(`删除key:${key}`)];
    }
    if (value.length > 10) return [CQ.text("value长度不大于10")];
    this.shortKey.set(key, value);
    db.start(async db => {
      await db.run(`insert into COCShortKey(key, value) values (?, ?)`, key, value);
      await db.close();
    }).catch(NOP);
    return [CQ.text(`添加key:${key}=${value}`)];
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getDice(event: CQEvent<"message.group"> | CQEvent<"message.private">,
      execArray: RegExpExecArray): Promise<CQTag[]> {
    event.stopPropagation();
    let dice = execArray[1];
    if (dice === undefined) return [];
    this.shortKey.forEach((value, key) => {
      dice = dice.replace(new RegExp(key), value);
    });
    if (/[^+\-*d0-9#]/.test(dice)) {
      return [CQ.text(".d错误参数")];
    }
    return [CQ.text(CQBotCOC.dice(dice, this.cheater))];
  }
  
  @canCallGroup()
  @canCallPrivate()
  async getRandom(event: CQEvent<"message.group"> | CQEvent<"message.private">,
      execArray: RegExpExecArray): Promise<CQTag[]> {
    let {num, times = 2} = execArray.groups as { num?: string, times?: string } ?? {};
    if (num === undefined) return [];
    let number = distribution(+times) * +num | 0;
    return [CQ.text(`${times}重随机数:${number}`)];
  }
  
  @canCallGroup()
  @canCallPrivate()
  async setCheater() {
    this.cheater = !this.cheater;
    return [CQ.text("全1" + (this.cheater ? "开" : "关"))];
  }
  
  private readShortKey() {
    db.start(async db => {
      let all = await db.all<{ key: string, value: string }[]>(`select key, value from COCShortKey`);
      all.forEach(({key, value}) => this.shortKey.set(key, value));
      await db.close();
    }).catch(NOP);
  }
  
  private static dice(str: string, cheater: boolean): string {
    let handles = str.split(/(?=[+\-*])/).map<calc>(value => {
      let groups = (/^(?<op>[+\-*])?(?<num>\d+)?(d(?<max>\d+))?$/.exec(value)?.groups) as {
        op?: "+" | "-" | "*"
        num?: string
        max?: string
      } ?? {};
      let num: number | number[] = +(groups.num ?? 1);
      let op = groups.op ?? "+";
      if (groups.max) {
        let dices: { num: number, list: Uint16Array };
        if (cheater) {
          dices = {
            list: new Uint16Array(num).fill(1),
            num: num,
          };
        } else {
          dices = dice(num, +groups.max);
        }
        return {
          origin: value,
          op,
          ...dices,
        };
      } else {
        return {
          op: op,
          num: num,
          list: null,
          origin: null,
        };
      }
    });
    let preRet = handles.filter(v => v.list !== null).map((v) => {
      return `${v.origin}：[${v.list}]=${v.num}\n`;
    }).join("");
    let sumNum = this.calculate(handles);
    return `${preRet}${str}=${sumNum}`;
  }
  
  private static calculate(handles: calc[]): number {
    let cache = 1;
    return handles.reduceRight<number>((sum, v) => {
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
          logger.warn("未知的运算符:" + op);
          return sum;
        }
      }
    }, 0);
  }
}

type calc = { op: "+" | "-" | "*", num: number, list: Uint16Array | null, origin: string | null }

export default new CQBotCOC();