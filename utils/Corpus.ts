// noinspection JSUnusedGlobalSymbols

import {hrtime, Logable} from "./logger.js";
import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {CQMessage, deleteMsg, isAdmin, onlyText, sendAdminQQ, sendGroup, sendPrivate} from "@U/Util.js";
import type {Plug, PlugDecorator} from "../Plug.js";
import type {Any, Group, JSONable, Member} from "@U/Models.js";

export interface ICorpus {
	/**
	 * 正则匹配
	 * @default /$^/
	 */
	regexp?: RegExp,
	/**
	 * 名称
	 * @default 类名.方法名
	 */
	name: string,
	/**
	 * 私聊可用
	 * @default true
	 */
	canGroup?: boolean,
	/**
	 * 群聊可用
	 * @default true
	 */
	canPrivate?: boolean,
	/**
	 * 是否为合并转发消息
	 * @default false
	 */
	forward?: boolean,
	/**
	 * 是否需要管理员
	 * @default false
	 */
	needAdmin?: boolean,
	/**
	 * 大于 0 则启用，0 则关闭，小于 0 则报错
	 * @default 1
	 */
	isOpen?: number,
	/**帮助文本*/
	help?: string | undefined,
	/**
	 * 目标文本的最小长度, 不够时跳过 regexp 匹配
	 * @default 0
	 */
	minLength?: number,
	/**
	 * 目标文本的最大长度, 超出时跳过 regexp 匹配
	 * @default 100
	 */
	maxLength?: number,
	/**
	 * 权重
	 * @default 10
	 */
	weight: number,
	/**
	 * 大于 0 时延时固定时间撤回，单位s
	 * @default 0
	 */
	deleteMSG?: number,
	/**
	 * \>0 时启用调用限速
	 * @default 0
	 */
	speedLimit?: number,
}

/**
 * @param {SendGroupData} data 数据
 * @return {Promise<boolean>} 是否发送
 */
export async function sendGroupTags(data: SendGroupData): Promise<boolean> {
	const {event, hrtime: time, member, group, corpuses} = data;
	if (group.baned) {
		return false;
	}
	if (member.baned) {
		return false;
	}
	const text = onlyText(event);
	const corpusName: string[] = [];
	const txt = `\t来源：${group.id}.${member.id}：${text}`;
	for (const element of corpuses) {
		const exec: RegExpExecArray | null = element.execGroup(event, text);
		if (exec == null) {
			continue;
		}
		const msg = await element.runGroup({event, execArray: exec, hrtime: time, member, group, text});
		if (msg.length < 1) {
			continue;
		}
		// if (!corpus.forward) {
		// 	return sendGroup(event, tags);
		// } else if (tags[0].tagName === "node") {
		// 	return sendForward(event, tags as messageNode);
		// } else {
		// 	return sendForwardQuick(event, tags);
		// }
		await sendGroup(event, msg).then((msg) => {
			if (element.deleteMSG > 0) {
				deleteMsg(event.bot, msg.message_id, element.deleteMSG);
			}
			element.laterOpen();
		}).finally(() => {
			corpusName.push(element.name);
		}).catch((e) => {
			Corpus.logger.error(e);
			element.canGroup = false;
			return sendAdminQQ(event.bot, `群聊消息发送失败：${element.toString()}`);
		}).catch(global.NOP);
	}
	if (corpusName.length > 0) {
		Corpus.logger.info(hrtime(time, corpusName.join(",") + txt));
		return true;
	}
	return false;
}

/**
 * @param {SendPrivateData} data 数据
 * @return {Promise<boolean>} 是否发送
 */
export async function sendPrivateTags(data: SendPrivateData): Promise<boolean> {
	const {event, hrtime: time, member, corpuses} = data;
	if (member.baned) {
		return false;
	}
	const text = onlyText(event);
	const corpusName: string[] = [];
	const txt = `\t来源：${member.id}：${text}`;
	for (const element of corpuses) {
		const exec: RegExpExecArray | null = element.execPrivate(event, text);
		if (exec == null) {
			continue;
		}
		const msg = await element.runPrivate({event, execArray: exec, hrtime: time, member, text});
		if (msg.length < 1) {
			continue;
		}
		await sendPrivate(event, msg).then(() => {
			element.laterOpen();
		}).finally(() => {
			corpusName.push(element.name);
		}).catch((e) => {
			Corpus.logger.error(e);
			element.isOpen = -1;
			return sendAdminQQ(event.bot, `私聊消息发送失败：${element.toString()}`);
		}).catch(global.NOP);
	}
	if (corpusName.length > 0) {
		Corpus.logger.info(hrtime(time, corpusName.join(",") + txt));
		return true;
	}
	return false;
}

function* cast2Tag(result: Any): Generator<CQTag, void, void> {
	if (result == null) {
		return;
	}
	if (typeof result !== "object") {
		return yield CQ.text(result.toString());
	}
	if (result instanceof CQTag) {
		return yield result;
	}
	if (!Array.isArray(result)) {
		return yield CQ.text(result.toString());
	}
	if (result.length <= 0) {
		return;
	}
	for (const v of result) {
		yield* cast2Tag(v);
	}
	return;
}

export class Corpus extends Logable implements ICorpus, JSONable {
	public readonly plug: Plug;
	public readonly funcName: string;
	public readonly regexp: RegExp;
	public readonly name: string;
	public readonly forward: boolean;
	public readonly needAdmin: boolean;
	public readonly help: string | undefined;
	public readonly minLength: number;
	public readonly maxLength: number;
	public readonly weight: number;
	public readonly deleteMSG: number;
	public readonly speedLimit: number;
	public canGroup: boolean;
	public canPrivate: boolean;
	public isOpen: number;

	constructor(plug: Plug, funcName: string, iCorpus: ICorpus) {
		super();
		this.plug = plug;
		this.funcName = funcName;
		this.name = iCorpus.name ?? this.toString();
		// noinspection RegExpUnexpectedAnchor
		this.regexp = iCorpus.regexp ?? /$^/;
		this.canGroup = iCorpus.canGroup ?? true;
		this.canPrivate = iCorpus.canPrivate ?? true;
		this.forward = iCorpus.forward ?? false;
		this.isOpen = iCorpus.isOpen ?? 1;
		this.maxLength = iCorpus.maxLength ?? 100;
		this.minLength = iCorpus.minLength ?? 0;
		this.help = iCorpus.help;
		this.needAdmin = iCorpus.needAdmin ?? false;
		this.weight = iCorpus.weight ?? 10;
		this.deleteMSG = iCorpus.deleteMSG ?? 0;
		this.speedLimit = iCorpus.speedLimit ?? 0;
	}

	public override toString(): string {
		return `${this.plug.constructor.name}.${this.funcName}`;
	}

	public toJSON() {
		return {
			name: this.name, regexp: this.regexp.toString(), canGroup: this.canGroup, canPrivate: this.canPrivate,
			help: this.help, isOpen: this.isOpen, minLength: this.minLength, maxLength: this.maxLength,
			needAdmin: this.needAdmin, weight: this.weight,
		};
	}

	public execPrivate(event: CQEvent<"message.private">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case -1:
			return null;
		case 0:
			if (this.needAdmin || !this.canPrivate) {
				return null;
			}
			break;
		case 1:
			if (!this.canPrivate) {
				return null;
			}
			break;
		}
		return this.regexp.exec(text);
	}

	public execGroup(event: CQEvent<"message.group">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case -1:
			return null;
		case 0:
			if (this.needAdmin || !this.canGroup) {
				return null;
			}
			break;
		case 1:
			if (!this.canGroup) {
				return null;
			}
			break;
		}
		return this.regexp.exec(text);
	}

	public laterOpen(): void {
		if (this.isOpen >= 0 && this.speedLimit > 0) {
			setTimeout(() => {
				this.isOpen = 1;
			}, this.speedLimit);
		}
	}

	public async runPrivate(data: PrivateCorpusData): Promise<CQTag[]> {
		if (!this.canPrivate || data.event.contextType !== "message.private") {
			this.logger.warn(`${this}不可在 private 环境下调用`);
			return [];
		}
		return this.run(data);
	}

	public async runGroup(data: GroupCorpusData): Promise<CQTag[]> {
		if (!this.canGroup || data.event.contextType !== "message.group") {
			this.logger.warn(`${this}不可在 group 环境下调用`);
			return [];
		}
		return this.run(data);
	}

	private async run(data: CorpusData): Promise<CQTag[]> {
		try {
			if (this.isOpen === 0) {
				return [];
			}
			if (data.execArray == null) {
				return [];
			}
			const func: Any = Reflect.get(this.plug, this.funcName);
			if (func == null) {
				this.logger.error(`插件${this.toString()}没有任何值`);
				return [];
			}
			if (this.speedLimit > 0) {
				this.isOpen = 0;
			}
			let result: Any;
			if (typeof func !== "function") {
				data.event.stopPropagation();
				result = await func;
			} else {
				result = await (<canCallFunc>func).call(this.plug, data);
			}
			return [...cast2Tag(result)];
		} catch (e) {
			this.isOpen = -1;
			this.logger.error("调用出错：", e);
			sendAdminQQ(data.event.bot, `调用出错：${this.toString()}`).catch(global.NOP);
			return [];
		}
	}

	private test(event: CQMessage, length: number): -1 | 0 | 1 {
		if (event.isCanceled || length < this.minLength || length > this.maxLength || this.isOpen < 0) {
			return -1;
		}
		if (isAdmin(event)) {
			return 1;
		}
		return 0;
	}
}

interface SendPrivateData {
	event: CQEvent<"message.private">;
	hrtime: [number, number];
	member: Member;
	corpuses: Corpus[];
}

interface SendGroupData {
	event: CQEvent<"message.group">;
	hrtime: [number, number];
	member: Member;
	group: Group;
	corpuses: Corpus[];
}

export interface CorpusData {
	event: CQMessage;
	hrtime: [number, number];
	text: string;
	execArray: RegExpExecArray;
	member: Member;
	/**
	 * 当且仅当 {@link event} 的类型为 {@code CQEvent<"message.group">} 时有值
	 */
	group?: Group | undefined;
}

export interface PrivateCorpusData {
	event: CQEvent<"message.private">;
	hrtime: [number, number];
	text: string;
	execArray: RegExpExecArray;
	member: Member;
	group?: undefined;
}

export interface GroupCorpusData {
	event: CQEvent<"message.group">;
	hrtime: [number, number];
	text: string;
	execArray: RegExpExecArray;
	member: Member;
	group: Group;
}

type canCallFunc = (data: CorpusData) => canCallRet;
type canCallType = CQTag | string | number | bigint | boolean | symbol | canCallType[];
type canCallRet = canCallType | void | Promise<canCallType | void>;

/**
 * 可以标注在 `对象属性`，`getter`，{@link canCallFunc} 方法上<br/>
 * **注：**当目标**不是**方法时，将会自动停止冒泡
 */
export function canCall(corpus: ICorpus): PlugDecorator {
	return (target: { constructor: any; }, propertyKey: string) => {
		const corpuses: Map<string, ICorpus> = canCall.get(target.constructor);
		corpuses.set(propertyKey, corpus);
	};
}
canCall.get = function (target: new() => Plug): Map<string, ICorpus> {
	let metadata: Map<string, ICorpus> | undefined = Reflect.getMetadata(canCall.name, target);
	if (metadata == null) {
		metadata = new Map<string, ICorpus>();
		Reflect.defineMetadata(canCall.name, metadata, target);
	}
	return metadata;
};
canCall.mergeTo = function (target: Plug, corpuses: Corpus[]): void {
	for (const [key, corpus] of canCall.get(<any>target.constructor)) {
		const index: number = corpuses.findIndex(value => value.weight > corpus.weight);
		if (index === -1) {
			corpuses.push(new Corpus(target, key, corpus));
		} else {
			corpuses.splice(index, 0, new Corpus(target, key, corpus));
		}
	}
};
canCall.separateTo = function (target: Plug, corpuses: Corpus[]): void {
	for (let i = corpuses.length - 1; i >= 0; i--) {
		if (corpuses[i].plug === target) {
			corpuses.splice(i, 1);
		}
	}
};
