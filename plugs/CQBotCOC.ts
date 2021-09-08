import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {dice, distribution} from "../utils/COCUtils.js";
import {db} from "../utils/database.js";
import {logger} from "../utils/logger.js";
import {Equatable, DataCache} from "../utils/repeat.js";

class CQBotCOC extends Plug {
	private shortKey = new Map<string, string>();
	private cheater: boolean;
	private cache: DataCache<DiceCache>;

	constructor() {
		super(module);
		this.name = "QQ群聊-COC跑团相关";
		this.description = "一些跑团常用功能";
		this.version = 1;
		this.cheater = false;
		this.cache = new DataCache<DiceCache>({useClones: false, stdTTL: 60 * 5, deleteOnExpire: true});

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
		if (str === "") {
			str = "无";
		}
		return [CQ.text(str)];
	}

	@canCallGroup()
	@canCallPrivate()
	async getDiceSet(event: CQEvent<"message.group"> | CQEvent<"message.private">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {key, value} = execArray.groups as { key?: string, value?: string } ?? {};
		if (key === undefined || key.length > 5) {
			return [CQ.text("key格式错误或长度大于5")];
		}
		if (value === undefined) {
			db.start(async db => {
				await db.run(`DELETE FROM COCShortKey WHERE KEY = ?`, key);
				await db.close();
			}).catch(NOP);
			this.shortKey.delete(key);
			return [CQ.text(`删除key:${key}`)];
		}
		if (value.length > 10) {
			return [CQ.text("value长度不大于10")];
		}
		this.shortKey.set(key, value);
		db.start(async db => {
			await db.run(`INSERT INTO COCShortKey(key, value) VALUES (?, ?)`, key, value);
			await db.close();
		}).catch(NOP);
		return [CQ.text(`添加key:${key}=${value}`)];
	}

	@canCallGroup()
	@canCallPrivate()
	async getDice(event: CQEvent<"message.group"> | CQEvent<"message.private">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {times = "1", dice} = execArray.groups as { times: string, dice: string } ?? {};
		if (dice === undefined) {
			return [];
		}
		this.shortKey.forEach((value, key) => {
			dice = dice.replace(new RegExp(key, "g"), value);
		});
		if (/[^+\-*dD0-9#]/.test(dice)) {
			return [CQ.text(".d错误参数")];
		}
		let result = Array.from({length: +times}, () => this.dice(dice, event.context.user_id)).join("\n")
		return [CQ.text(result)];
	}

	@canCallGroup()
	@canCallPrivate()
	async getRandom(event: CQEvent<"message.group"> | CQEvent<"message.private">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {num, times = 2} = execArray.groups as { num?: string, times?: string } ?? {};
		if (num === undefined) {
			return [];
		}
		let number = distribution(+times) * +num | 0;
		return [CQ.text(`${times}重随机数:${number}`)];
	}

	@canCallGroup()
	@canCallPrivate()
	async setCheater(event: CQEvent<"message.group"> | CQEvent<"message.private">) {
		event.stopPropagation();
		this.cheater = !this.cheater;
		return [CQ.text("全1" + (this.cheater ? "开" : "关"))];
	}

	@canCallGroup()
	@canCallPrivate()
	async getAddedRandom(event: CQEvent<"message.group"> | CQEvent<"message.private">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {num: numStr} = execArray.groups as {
			num?: string
		} ?? {};
		let num: number = 1;
		if (numStr !== undefined) {
			num = +numStr;
		}
		if (num === 0) {
			return [];
		}
		let cache = this.cache.get(event.context.user_id);
		if (cache === undefined || cache.max <= 0) {
			return [CQ.text("5分钟之内没有投任何骰子")];
		}
		let calc = CQBotCOC.castString(`+${num}d${cache.max}`, this.cheater);
		cache.list.push(...calc.list ?? []);
		return [CQ.text(`${calc.origin}：[${calc.list}]=${calc.num}\n[${cache.list}]`)];
	}

	private readShortKey() {
		db.start(async db => {
			let all = await db.all<{ key: string, value: string }[]>(`SELECT KEY, VALUE FROM COCShortKey`);
			all.forEach(({key, value}) => this.shortKey.set(key, value));
			await db.close();
		}).catch(NOP);
	}

	private dice(str: string, userId: number): string {
		let handles = str.split(/(?=[+\-*])/).map<calc>(value => {
			return CQBotCOC.castString(value, this.cheater);
		});
		let preRet = handles.filter(v => v.list !== null).map((v) => {
			return `${v.origin}：[${v.list}]=${v.num}`;
		}).join("\n");
		str = handles.map(value => `${value.op}${value.origin}`).join("");
		let sumNum = CQBotCOC.calculate(handles);
		if (preRet !== "") {
			if (handles.length === 1) {
				this.cache.set(userId, new DiceCache(handles[0].max, handles[0].list ?? <number[]>[]));
				return preRet;
			} else {
				return `${preRet}\n${str}=${sumNum}`;
			}
		} else {
			return `${str}=${sumNum}`;
		}
	}

	private static castString(value: string, cheater: boolean): calc {
		let groups = /^(?<op>[+\-*])?(?<num>\d+)?(?:[dD](?<max>\d+))?$/.exec(value)?.groups as {
			op?: "+" | "-" | "*"
			num?: string
			max?: string
		} ?? {};
		let num: number = +(groups.num ?? 1);
		let op = groups.op ?? "+";
		let max = groups.max;
		if (max !== undefined && max !== "") {
			let dices: { num: number, list: Uint16Array };
			if (cheater) {
				dices = {
					list: new Uint16Array(num).fill(1),
					num: num,
				};
			} else {
				dices = dice(num, +max);
			}
			return {
				origin: `${num}d${max}`,
				op,
				...dices,
				max: +max,
			};
		} else {
			return {
				op: op,
				num: num,
				list: null,
				origin: num.toString(),
				max: num,
			};
		}
	}

	private static calculate(handles: calc[]): number {
		const map = {
			"*": (sum: [number, number], num: number) => {
				sum[1] *= num;
				return sum;
			},
			"+": (sum: [number, number], num: number) => {
				let number = num * sum[1];
				sum[1] = 1;
				sum[0] += number;
				return sum;
			},
			"-": (sum: [number, number], num: number) => {
				let number = num * sum[1];
				sum[1] = 1;
				sum[0] -= number;
				return sum;
			},
		} as const;
		return handles.reduceRight<[number, number]>((sum, v) => {
			let arr: [number, number] | undefined = map[v.op]?.(sum, v.num);
			if (arr === undefined) {
				logger.warn("未知的运算符:" + v.op);
				return sum;
			}
			return arr;
		}, [0, 1])[0];
	}
}

type calc = { op: "+" | "-" | "*", num: number, list: Uint16Array | null, origin: string, max: number }

class DiceCache extends Equatable {
	public max: number;
	public list: number[];

	constructor(max: number, list: Iterable<number>) {
		super();
		this.max = max;
		this.list = [...list];
	}

	public equal(obj: any): boolean {
		return obj instanceof DiceCache && obj.max === this.max;
	}

}

export default new CQBotCOC();