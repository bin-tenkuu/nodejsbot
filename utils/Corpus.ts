// noinspection JSUnusedGlobalSymbols

import {Logable} from "./logger.js";
import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {CQMessage, deleteMsg, isAdmin, onlyText, sendGroup, sendPrivate} from "./Util.js";
import type {Plug} from "../Plug.js";
import type {ErrorAPIResponse, MessageId} from "go-cqwebsocket/out/Interfaces.js";
import type {canCallFunc} from "./Annotation.js";
import type {Any, Group, JSONable, Member} from "./Models.js";

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
	/**消息回调*/
	then?(event: CQMessage, value: MessageId): void | Promise<void>,
	/**消息错误回调*/
	catch?(event: CQMessage, value: ErrorAPIResponse): void | Promise<void>,
}

export class Corpus extends Logable implements ICorpus, JSONable {
	/**
	 * @param {SendGroupData} data 数据
	 * @return {Promise<boolean>} 是否发送
	 */
	public static async sendGroupTags(data: SendGroupData): Promise<boolean> {
		const {event, hrtime, member, group, corpuses} = data;
		if (group.baned) {
			return false;
		}
		if (member.baned) {
			return false;
		}
		const text = onlyText(event);
		const corpusName: string[] = [];
		const {user_id, group_id} = event.context;
		const txt = `\t来源：${group_id}.${user_id}：${text}`;
		for (const element of corpuses) {
			const exec: RegExpExecArray | null = element.execGroup(event, text);
			if (exec == null) {
				continue;
			}
			if (element.isOpen === 0) {
				this.logger.info(`禁用${this.toString()}：${txt}`);
				continue;
			}
			const msg = await element.run(event, exec, member, group);
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
			await this.then(sendGroup(event, msg).then((msg) => {
				if (element.deleteMSG > 0) {
					deleteMsg(event.bot, msg.message_id, element.deleteMSG);
				}
				return msg;
			}), element, event, corpusName);
		}
		if (corpusName.length > 0) {
			this.hrtime(hrtime, corpusName.join(",") + txt);
			return true;
		}
		return false;
	}

	/**
	 * @param {SendPrivateData} data 数据
	 * @return {Promise<boolean>} 是否发送
	 */
	public static async sendPrivateTags(data: SendPrivateData): Promise<boolean> {
		const {event, hrtime, member, corpuses} = data;
		if (member.baned) {
			return false;
		}
		const text = onlyText(event);
		const corpusName: string[] = [];
		const {user_id} = event.context;
		const txt = `\t来源：${user_id}：${text}`;
		for (const element of corpuses) {
			const exec: RegExpExecArray | null = element.execPrivate(event, text);
			if (exec == null) {
				continue;
			}
			if (element.isOpen === 0) {
				this.logger.info(`禁用${this.toString()}：${txt}`);
				continue;
			}
			const msg = await element.run(event, exec, member);
			if (msg.length < 1) {
				continue;
			}
			await this.then(sendPrivate(event, msg), element, event, corpusName);
		}
		if (corpusName.length > 0) {
			this.hrtime(hrtime, corpusName.join(",") + txt);
			return true;
		}
		return false;
	}

	private static async then(prom: Promise<MessageId>, element: Corpus, event: CQMessage, corpus: string[]) {
		return prom.then((value) => {
			element.laterOpen();
			return element.then(event, value);
		}, (reason) => {
			return element.catch(event, reason);
		}).finally(() => {
			corpus.push(element.name);
		}).catch((e) => {
			this.logger.error(e);
			element.isOpen = -1;
		});
	}

	public readonly plug: Plug;
	public readonly funcName: string;
	public readonly regexp: RegExp;
	public readonly name: string;
	public canGroup: boolean;
	public canPrivate: boolean;
	public readonly forward: boolean;
	public readonly needAdmin: boolean;
	public isOpen: number;
	public readonly help: string | undefined;
	public readonly minLength: number;
	public readonly maxLength: number;
	public readonly weight: number;
	public readonly deleteMSG: number;
	public readonly speedLimit: number;

	public then(event: CQMessage, value: MessageId): void | Promise<void> {
	}

	public catch(event: CQMessage, value: ErrorAPIResponse): void | Promise<void> {
		Corpus.logger.error(`${this.toString()}:${JSON.stringify(value)}`);
	}

	#func: Any = undefined;

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
		iCorpus.then != null && (this.then = iCorpus.then);
		iCorpus.catch != null && (this.catch = iCorpus.catch);
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

	private execPrivate(event: CQEvent<"message.private">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case -1:
			return null;
		case 0:
			if (this.needAdmin || this.isOpen < 0 || !this.canPrivate) {
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

	private execGroup(event: CQEvent<"message.group">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case -1:
			return null;
		case 0:
			if (this.needAdmin || this.isOpen < 0 || !this.canGroup) {
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

	private async run(event: CQEvent<"message.private">, exec: RegExpExecArray | null,
			member: Member, group?: undefined): Promise<CQTag[]>;
	private async run(event: CQEvent<"message.group">, exec: RegExpExecArray | null,
			member: Member, group: Group): Promise<CQTag[]>;
	private async run(event: CQMessage, exec: RegExpExecArray | null, member: Member, group?: Group): Promise<CQTag[]> {
		if (exec == null) {
			return [];
		}
		if (this.#func == null) {
			const obj: unknown = Reflect.get(this.plug, this.funcName);
			if (obj == null) {
				this.isOpen = -1;
				const text = `插件${this.toString()}没有任何值`;
				this.logger.error(text);
				return [CQ.text(text)];
			}
			this.#func = typeof obj === "function" ? (<Function>obj).bind(this.plug) : obj;
		}
		try {
			if (this.speedLimit > 0) {
				this.isOpen = 0;
			}
			let result: Any;
			if (typeof this.#func !== "function") {
				event.stopPropagation();
				result = this.#func;
			} else if (this.canPrivate && event.contextType === "message.private") {
				result = await (<canCallFunc>this.#func)({event, execArray: exec, member});
			} else if (this.canGroup && event.contextType === "message.group") {
				result = await (<canCallFunc>this.#func)({event, execArray: exec, member, group});
			} else {
				this.logger.info(`不可调用[${this.toString()}]`);
				result = [CQ.text(`插件${this.toString()}方法不可在${event.contextType}环境下调用`)];
			}
			if (result == null) {
				return [];
			} else if (typeof result === "object") {
				if (Array.isArray(result)) {
					if (result.length > 0) {
						if (result[0] instanceof CQTag) {
							return result;
						} else {
							return [CQ.text(`插件${this.toString()}返回的数组不是CQTag类型`)];
						}
					}
					return [];
				}
				return [CQ.text(result.toString())];
			} else {
				return [CQ.text(result.toString())];
			}
		} catch (e) {
			this.isOpen = -1;
			this.logger.error("调用出错:", e);
			return [CQ.text(`调用出错:` + this.toString())];
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

	private laterOpen(): void {
		if (this.isOpen >= 0 && this.speedLimit > 0) {
			setTimeout(() => {
				this.isOpen = 1;
			}, this.speedLimit);
		}
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
	execArray: RegExpExecArray;
	member: Member;
	group?: Group | undefined;
}

export interface PrivateCorpusData {
	event: CQEvent<"message.private">;
	execArray: RegExpExecArray;
	member: Member;
	group?: Group | undefined;
}

export interface GroupCorpusData {
	event: CQEvent<"message.group">;
	execArray: RegExpExecArray;
	member: Member;
	group: Group;
}
