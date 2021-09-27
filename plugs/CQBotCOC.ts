import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {dice, DiceResult, distribution} from "../utils/COCUtils.js";
import {db} from "../utils/database.js";
import {DataCache} from "../utils/repeat.js";
import {CQMessage} from "../utils/Util.js";

class CQBotCOC extends Plug {
	private shortKey = new Map<string, string>();
	private cheater: boolean;
	private cache: DataCache<DiceCache>;
	private specialEffects: string;

	constructor() {
		super(module);
		this.name = "QQ群聊-COC跑团相关";
		this.description = "一些跑团常用功能";
		this.version = 1;
		this.cheater = false;
		this.cache = new DataCache<DiceCache>(undefined, (l, r) => l.max === r.max);
		this.specialEffects = "bug";
		this.readShortKey();
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getDiceStat(event: CQMessage): Promise<CQTag[]> {
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
	protected async getDiceSet(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {key, value} = execArray.groups as { key?: string, value?: string } ?? {};
		if (key === undefined || key.length > 5) {
			return [CQ.text("key格式错误或长度大于5")];
		}
		if (value === undefined) {
			db.sync(db => {
				db.prepare<string>("DELETE FROM COCShortKey WHERE key=?").run(key);
			});
			this.shortKey.delete(key);
			return [CQ.text(`删除key:${key}`)];
		}
		if (value.length > 10) {
			return [CQ.text("value长度不大于10")];
		}
		this.shortKey.set(key, value);
		db.sync(db => {
			db.prepare<[string, string]>("INSERT INTO COCShortKey(key, value) VALUES (?, ?);").run(key, value);
		});
		return [CQ.text(`添加key:${key}=${value}`)];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getDice(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
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
		const result = Array.from({length: +times}, () => this.dice(dice, event.context.user_id)).join("\n");
		return [CQ.text(result)];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getRandom(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {num, times = 2} = execArray.groups as { num?: string, times?: string } ?? {};
		if (num === undefined) {
			return [];
		}
		const number = distribution(+times) * +num | 0;
		return [CQ.text(`${times}重随机数:${number}`)];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async setCheater(event: CQMessage): Promise<CQTag[]> {
		event.stopPropagation();
		this.cheater = !this.cheater;
		return [CQ.text("全1" + (this.cheater ? "开" : "关"))];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async setDiceType(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {operator} = execArray.groups as { operator: string } ?? {};
		if (operator == null) {
			return [];
		}
		if (operator === "bug") {
			this.specialEffects = "bug";
			return [CQ.text("进入默认状态")];
		}
		if (SpecialEffects.has(operator)) {
			this.specialEffects = operator;
			return [CQ.text(`进入${SpecialEffects.getState(operator)}状态`)];
		}
		return [CQ.text("未知状态")];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getAddedRandom(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {num: numStr} = execArray.groups as {
			num?: string
		} ?? {};
		let num: number = 1;
		if (numStr !== undefined) {
			num = +numStr;
		}
		if (num === 0) {
			return [];
		}
		const cache: DiceCache | undefined = this.cache.get(event.context.user_id);
		if (cache === undefined || cache.max <= 0) {
			return [CQ.text("5分钟之内没有投任何骰子")];
		}
		const calc: Calc = CQBotCOC.castString(`+${num}d${cache.max}`, this.cheater);
		cache.list.push(...calc.list ?? []);
		return [CQ.text(`${calc.origin}：[${calc.list}]=${calc.num}\n[${cache.list}]`)];
	}

	private static castString(value: string, cheater: boolean): Calc {
		const groups = /^(?<op>[+\-*])?(?<num>\d+)?(?:[dD](?<max>\d+))?$/.exec(value)?.groups as {
			op?: "+" | "-" | "*"
			num?: string
			max?: string
		} ?? {};
		const num: number = +(groups.num ?? 1);
		const op = groups.op ?? "+";
		const max = groups.max;
		if (max === undefined || max === "") {
			return {
				op: op,
				num: num,
				list: null,
				origin: num.toString(),
				max: num,
			};
		}
		let dices: DiceResult = cheater ? {
			list: new Uint32Array(num).fill(1),
			num: num,
			max: +max,
		} : dice(num, +max);
		return {
			origin: `${dices.list.length}d${dices.max}`,
			op,
			...dices,
		};
	}

	private static calculate(handles: Calc[]): number {
		const map = {
			"*": (sum: [number, number], num: number) => {
				sum[1] *= num;
				return sum;
			},
			"+": (sum: [number, number], num: number) => {
				const number = num * sum[1];
				sum[1] = 1;
				sum[0] += number;
				return sum;
			},
			"-": (sum: [number, number], num: number) => {
				const number = num * sum[1];
				sum[1] = 1;
				sum[0] -= number;
				return sum;
			},
		} as const;
		return handles.reduceRight<[number, number]>((sum, v) => {
			const arr: [number, number] | undefined = map[v.op]?.(sum, v.num);
			if (arr === undefined) {
				this.logger.warn("未知的运算符:" + v.op);
				return sum;
			}
			return arr;
		}, [0, 1])[0];
	}

	private readShortKey() {
		db.sync(db => {
			const all: { key: string, value: string }[] = db.prepare<[]>("SELECT key, value FROM COCShortKey;").all();
			all.forEach(({key, value}) => this.shortKey.set(key, value));
		});
	}

	private dice(str: string, userId: number): string {
		const handles = str.split(/(?=[+\-*])/).map<Calc>(value => {
			return CQBotCOC.castString(value, this.cheater);
		});
		if (handles.length === 1) {
			const calc: Calc = handles[0];
			if (calc.list !== null) {
				this.cache.set(userId, new DiceCache(calc.max, calc!.list));
				SpecialEffects.runFunc(this.specialEffects, calc);
				return `${calc.origin}：[${calc.list}]=${calc.num}${calc.state ?? ""}`;
			} else {
				return `${calc.op}${calc.origin}=${calc.num}`;
			}
		}
		let preRet: string = handles.filter(v => v.list !== null).map((v) => {
			return `${v.origin}：[${v.list}]=${v.num}`;
		}).join("\n");
		str = handles.map(value => `${value.op}${value.origin}`).join("");
		const sumNum = CQBotCOC.calculate(handles);
		return `${preRet}\n${str}=${sumNum}`;
	}
}

type EffectFunc = (data: Calc) => void;
type Calc = { op: "+" | "-" | "*", num: number, list: Uint32Array | null, origin: string, max: number, state?: string };

class DiceCache {
	public max: number;
	public list: number[];

	constructor(max: number, list: Iterable<number>) {
		this.max = max;
		this.list = [...list];
	}
}

class SpecialEffects {
	private static Effects: { readonly [key: string]: [string, EffectFunc] | undefined } = Object.freeze({
		"bug": [
			"默认", _ => void 0,
		],
		"wrf": [
			"温柔f", data => {
				const list: Uint32Array | null = data.list;
				if (list === null) {
					return;
				}
				if (list.length > 2 && list[0] === list[1]) {
					++list[1];
					// ++data.num;
				}
				data.state = "[温柔]";
			},
		],
		"cbf": [
			"残暴f", data => {
				const list: Uint32Array | null = data.list;
				if (list === null) {
					return;
				}
				// data.num += list[0] - list[1];
				list[1] = list[0];
				data.state = "[残暴]";
			},
		],
		"ajf": [
			"傲娇f", data => {
				if (Math.random() < 0.5) {
					return SpecialEffects.getFunc("wrf")(data);
				} else {
					return SpecialEffects.getFunc("cbf")(data);
				}
			},
		],
		"wr": [
			"温柔", data => {
				if (Math.random() < 0.5) {
					return SpecialEffects.getFunc("wrf")(data);
				} else {
					return SpecialEffects.getFunc("bug")(data);
				}
			},
		],
		"cb": [
			"残暴", data => {
				if (Math.random() < 0.5) {
					return SpecialEffects.getFunc("cbf")(data);
				} else {
					return SpecialEffects.getFunc("bug")(data);
				}
			},
		],
		"aj": [
			"傲娇", data => {
				const random = Math.random() * 3;
				if (random < 1) {
					return SpecialEffects.getFunc("wrf")(data);
				}
				if (random < 2) {
					return SpecialEffects.getFunc("cbf")(data);
				}
				return SpecialEffects.getFunc("bug")(data);
			},
		],
	});

	public static runFunc(key: string, calc: Calc): void {
		return this.getFunc(key)(calc);
	}

	public static getState(key: string): string {
		const effect = this.Effects[key];
		if (effect === undefined) {
			return "默认";
		}
		return effect[0];
	}

	public static has(key: string): boolean {
		return Reflect.has(this.Effects, key);
	}

	private static getFunc(key: string): EffectFunc {
		return (this.Effects[key] ?? this.Effects["bug"])![1];
	}
}

export default new CQBotCOC();
