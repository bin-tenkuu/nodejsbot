import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {ErrorAPIResponse, MessageId} from "go-cqwebsocket/out/Interfaces.js";
import {Plug} from "../Plug.js";
import {CQData} from "../plugs/CQData.js";
import {canCallGroupFunc, canCallPrivateFunc, canCallType} from "./Annotation.js";
import {Logable} from "./logger.js";
import {CQMessage, deleteMsg, isAdmin, onlyText, sendGroup, sendPrivate} from "./Util.js";

export type sauceNAOResult = I.sauceNAOResult;
export type paulzzhTouHouType = I.paulzzhTouHouType;
export type loliconPost = I.loliconPost;
export type loliconDate = I.loliconDate;
export type toubiecType = I.toubiecType;
export type pixivCatType = I.pixivCatType;
export type DMXKType = I.DMXKType;
export type YHType = I.YHType;

class Modified {
	public is_modified: boolean = false;
	protected _gmt_modified: number = 0;

	public modified() {
		this._gmt_modified = Date.now();
		this.is_modified = true;
	}

// noinspection JSUnusedGlobalSymbols
	public get gmt_modified(): number {
		return this._gmt_modified;
	}
}

export type IGroup = { readonly id: number, exp: number, gmt_modified: number, is_baned: 0 | 1 }

export class Group extends Modified implements IGroup, JSONable {
	protected readonly _id: number;
	protected _exp: number = 0;
	protected _is_baned: 0 | 1 = 0;

	constructor(obj: IGroup | number) {
		super();
		if (typeof obj === "number") {
			this._id = obj;
			return;
		} else {
			this._id = obj.id;
			this._exp = obj.exp;
			this._gmt_modified = obj.gmt_modified;
		}
	}

	public toJSON(): IGroup {
		return {id: this._id, exp: this._exp, gmt_modified: this._gmt_modified, is_baned: this._is_baned};
	}

	public get exp(): number {
		return this._exp;
	}

	public set exp(value: number) {
		this._exp = value;
		this.modified();
	}

	public get id() {
		return this._id;
	}

	public get is_baned(): 0 | 1 {
		return this._is_baned;
	}

	public set is_baned(value: 0 | 1) {
		this._is_baned = value;
		this.modified();
	}

	public get baned(): boolean {
		return this._is_baned !== 0;
	}
}

export type IMember = IGroup & { name: string };

export class Member extends Group implements IMember, JSONable {
	private _name: string = "";

	constructor(obj: IMember | number) {
		super(obj);
		if (typeof obj !== "number") {
			this._name = obj.name;
		}
	}

	public addExp(exp: number): boolean {
		exp += this._exp;
		if (exp < 0) {
			return false;
		} else {
			this.exp = exp;
			return true;
		}
	}

	public toJSON(): IMember {
		return {
			id: this._id, exp: this._exp, name: this._name, gmt_modified: this._gmt_modified, is_baned: this._is_baned,
		};
	}

	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
		this.modified();
	}

}

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
	/**消息回调*/
	then?(event: CQMessage, value: MessageId): void | Promise<void>,
	/**消息错误回调*/
	catch?(event: CQMessage, value: ErrorAPIResponse): void | Promise<void>,
}

export class Corpus<T extends Plug = Plug> extends Logable implements ICorpus, JSONable {
	public static async sendGroupTags(event: CQEvent<"message.group">, hrtime: [number, number]): Promise<boolean> {
		const {group_id, user_id} = event.context;
		if (CQData.getInst().getGroup(group_id).baned) {
			return false;
		}
		if (CQData.getInst().getMember(user_id).baned) {
			return false;
		}
		const text = onlyText(event);
		const corpus: string[] = [];
		for (const element of Plug.corpus) {
			const exec: RegExpExecArray | null = element.execGroup(event, text);
			if (exec == null) {
				continue;
			}
			const msg = await element.run(event, exec);
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
			}), element, event, corpus);
		}
		if (corpus.length > 0) {
			const {user_id, group_id} = event.context;
			const txt = `\t来源：${group_id ?? ""}.${user_id}`;
			this.hrtime(hrtime, corpus.join(",") + txt);
			return true;
		}
		return false;
	}

	public static async sendPrivateTags(event: CQEvent<"message.private">, hrtime: [number, number]): Promise<boolean> {
		const {user_id} = event.context;
		if (CQData.getInst().getMember(user_id).baned) {
			return false;
		}
		const text = onlyText(event);
		const corpus: string[] = [];
		for (const element of Plug.corpus) {
			const exec: RegExpExecArray | null = element.execPrivate(event, text);
			if (exec == null) {
				continue;
			}
			const msg = await element.run(event, exec);
			if (msg.length < 1) {
				continue;
			}
			await this.then(sendPrivate(event, msg), element, event, corpus);
		}
		if (corpus.length > 0) {
			const {user_id} = event.context;
			const txt = `\t来源：${user_id}`;
			this.hrtime(hrtime, corpus.join(",") + txt);
			return true;
		}
		return false;
	}

	private static async then(prom: Promise<MessageId>, element: Corpus, event: CQMessage, corpus: string[]) {
		return prom.then((value) => {
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

	public readonly plug: T;
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

	public then(event: CQMessage, value: MessageId): void | Promise<void> {
	}

	public catch(event: CQMessage, value: ErrorAPIResponse): void | Promise<void> {
		Corpus.logger.error(`${this}:${JSON.stringify(value)}`);
	}

	public func: Function | null = null;

	constructor(plugType: T, funcName: string, iCorpus: ICorpus) {
		super();
		this.plug = plugType;
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
		iCorpus.then != null && (this.then = iCorpus.then);
		iCorpus.catch != null && (this.catch = iCorpus.catch);
	}

	public toString(): string {
		return `${this.plugName}.${this.funcName}`;
	}

	public execPrivate(event: CQEvent<"message.private">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case -1:
			return null;
		case 0:
			if (this.needAdmin || this.isOpen <= 0 || !this.canPrivate) {
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
			if (this.needAdmin || this.isOpen <= 0 || !this.canGroup) {
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

	public async run(event: CQMessage, exec: RegExpExecArray | null): Promise<CQTag[]> {
		if (exec == null) {
			return [];
		}
		if (this.func == null) {
			const func: canCallType = Reflect.get(this.plug, this.funcName);
			if (typeof func !== "function") {
				this.isOpen = -1;
				const text = `插件${this}不是方法`;
				this.logger.error(text);
				return [CQ.text(text)];
			}
			this.func = func.bind(this.plug);
		}
		try {
			const {user_id} = event.context;
			const data: CQData = CQData.getInst();
			const member: Member = data.getMember(user_id);
			if (this.canPrivate && event.contextType === "message.private") {
				return await (<canCallPrivateFunc>this.func)(event, exec, member);
			} else if (this.canGroup && event.contextType === "message.group") {
				const {group_id} = event.context;
				const group: Group = data.getGroup(group_id);
				return await (<canCallGroupFunc>this.func)(event, exec, member, group);
			} else {
				this.logger.info(`不可调用[${this}]`);
				return [CQ.text(`插件${this}方法不可在${event.contextType}环境下调用`)];
			}
		} catch (e) {
			this.logger.error("调用出错", e);
			return [CQ.text(`调用出错:` + this.toString())];
		}
	}

	public toJSON() {
		return {
			name: this.name, regexp: this.regexp.toString(), canGroup: this.canGroup, canPrivate: this.canPrivate,
			help: this.help, isOpen: this.isOpen, minLength: this.minLength, maxLength: this.maxLength,
			needAdmin: this.needAdmin, weight: this.weight,
		};
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

	public get plugName() {
		return this.plug.constructor.name;
	}
}

export interface JSONable {
	toJSON(): I.JSONObject;
}

module I {
	export type sauceNAOResultsHeader = {
		/** 库id */
		index_id: number, /** 库名字 */
		index_name: string
		/** 相似度 */
		similarity: number, /** 缩略图url */
		thumbnail: string
	};
	export type JSONObject = {
		[key: string]: string | number | boolean | JSONObject | JSONObject[] | null | undefined;
	};
	export type setu = {
		/**作品 PID*/
		pid: number
		/**作品所在 P*/
		p: number
		/**作者 UID*/
		uid: number
		/**作品标题*/
		title: string
		/**作者名（入库时，并过滤掉 @ 及其后内容）*/
		author: string
		/**图片链接（可能存在有些作品因修改或删除而导致 404 的情况）*/
		url: string
		/**是否 R18（在色图库中的分类，并非作者标识的 R18）*/
		r18: boolean
		/**原图宽度 px*/
		width: number
		/**原图高度 px*/
		height: number
		/**作品标签，包含标签的中文翻译（有的话）*/
		tags: string[]
	};
	export type sauceNAOResult = {
		header: {
			/** 长时限制 */
			long_limit: string, /**长时剩余*/
			long_remaining: number, /** 短时限制 */
			short_limit: string, /**短时剩余*/
			short_remaining: number, /** 请求的结果数 */
			results_requested: string, /**返回的结果数*/
			results_returned: number
		}, results: {
			header: I.sauceNAOResultsHeader, data: {
				[key: string]: unknown
			}
		}[]
	};
	export type paulzzhTouHouType = {
		author: string
		height: number
		id: number
		jpegurl: string
		md5: string
		preview: string
		size: number
		source: string
		tags: string
		timestamp: number
		url: string
		width: number
	};
	export type pixivCatType = {
		success: false
		error: string
	} | ({
		success: true
		id: number
		id_str: string
	} & ({
		multiple: true
		html: string
		original_urls: string[]
		original_urls_proxy: string[]
	} | {
		multiple: false
		original_url: string
		original_url_proxy: string
	}));
	export type loliconPost = {
		/**
		 * 0为非 R18，1为 R18，2为混合（在库中的分类，不等同于作品本身的 R18 标识）
		 * @default 0
		 */
		r18?: number
		/**返回从标题、作者、标签中按指定关键字模糊匹配的结果，大小写不敏感，性能和准度较差且功能单一，建议使用tag代替*/
		keyword?: string
		/**
		 * 一次返回的结果数量，范围为1到100；在指定关键字或标签的情况下，结果数量可能会不足指定的数量
		 * @default 1
		 */
		num?: number
		/**
		 * 是否使用 master_1200 缩略图
		 * @default ["original"]
		 */
		size1200?: boolean
	};
	export type loliconDate = {
		/**返回码，可能值详见后续部分*/
		code: number
		/**错误信息之类的*/
		msg: string
		/**结果数*/
		count: number
		/**色图数组*/
		data: I.setu[]
	};
	export type toubiecType = {
		id: string
		imgurl: string
		width: string
		height: string
		client_ip: string
		client_lsp: string
	};
	export type DMXKType = {
		"code": string, "imgurl": string, "width": string, "height": string
	};
	export type YHType = {
		"code": string, "imgurl": string, "width": string, "height": string
	};
}
