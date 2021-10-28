import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {ErrorAPIResponse, MessageId} from "go-cqwebsocket/out/Interfaces.js";
import {Plug} from "../Plug.js";
import {canCallType} from "./Annotation.js";
import {Logable} from "./logger.js";
import {CQMessage, deleteMsg, isAdmin, onlyText} from "./Util.js";

type sauceNAOResultsHeader = {
	/** 库id */
	index_id: number,
	/** 库名字 */
	index_name: string
	/** 相似度 */
	similarity: number,
	/** 缩略图url */
	thumbnail: string
};
export type sauceNAOResult = {
	header: {
		/** 长时限制 */
		long_limit: string,
		/**长时剩余*/
		long_remaining: number,
		/** 短时限制 */
		short_limit: string,
		/**短时剩余*/
		short_remaining: number,
		/** 请求的结果数 */
		results_requested: string,
		/**返回的结果数*/
		results_returned: number
	},
	results: {
		header: sauceNAOResultsHeader,
		data: {
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
	data: setu[]
};
type setu = {
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
export type toubiecType = {
	id: string
	imgurl: string
	width: string
	height: string
	client_ip: string
	client_lsp: string
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
export type DMXKType = {
	"code": string,
	"imgurl": string,
	"width": string,
	"height": string
};
export type YHType = {
	"code": string,
	"imgurl": string,
	"width": string,
	"height": string
};

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
	private _exp: number = 0;
	private readonly _id: number;
	private _is_baned: 0 | 1 = 0;

	constructor(obj: IGroup | number) {
		super();
		if (typeof obj === "number") {
			this._id = obj;
			return;
		} else {
			this._id = obj.id;
			this._exp = obj.exp;
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

export type IMember = { readonly id: number, name: string, exp: number, gmt_modified: number, is_baned: 0 | 1 };

export class Member extends Modified implements IMember, JSONable {
	private readonly _id: number;
	private _is_baned: 0 | 1 = 0;
	private _name: string = "";
	private _exp: number = 0;

	constructor(obj: IMember | number) {
		super();
		if (typeof obj === "number") {
			this._id = obj;
			return;
		} else {
			this._id = obj.id;
			this._name = obj.name;
			this._exp = obj.exp;
			this._is_baned = obj.is_baned;
			this._gmt_modified = obj.gmt_modified;
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

	public get exp(): number {
		return this._exp;
	}

	public set exp(v: number) {
		this._exp = v;
		this.modified();
	}

	public get id(): number {
		return this._id;
	}

	public get is_baned(): 0 | 1 {
		return this._is_baned;
	}

	public set is_baned(value: 0 | 1) {
		this._is_baned = value;
		this.modified();
	}

	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
		this.modified();
	}

	public get baned(): boolean {
		return this._is_baned !== 0;
	}
}

export type ICorpus = {
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
	/**消息回调*/
	then?: CorpusCB<MessageId>,
	/**消息错误回调*/
	catch?: CorpusCB<ErrorAPIResponse>,
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
};

export class Corpus extends Logable implements ICorpus, JSONable {
	public static async sendCorpusTags(event: CQMessage, hrtime: [number, number],
			callback: (this: void, tags: CQTag[], element: Corpus) => Promise<MessageId>): Promise<void> {
		const text = onlyText(event);
		const corpus: string[] = [];
		for (const element of Plug.corpus) {
			const exec: RegExpExecArray | null = event.contextType === "message.private" ?
					element.execPrivate(event, text) : element.execGroup(event, text);
			if (exec === null) {
				continue;
			}
			const msg = await element.run(event, exec).catch<CQTag[]>(e => {
				this.logger.error("语料库转换失败:" + element.name);
				this.logger.error(e);
				return [CQ.text("error:" + element.name + "\n")];
			});
			if (msg.length < 1) {
				continue;
			}
			await callback(msg, element).then(value => {
				if (element.deleteMSG > 0) {
					deleteMsg(event.bot, value.message_id, element.deleteMSG);
				}
				element.then(value, event);
			}, reason => {
				element.catch(reason, event);
			}).finally(() => {
				corpus.push(element.name);
			}).catch(NOP);
		}
		if (corpus.length > 0) {
			this.hrtime(hrtime, corpus.join(","));
		}
	}

	public plugType: { new(): Plug };
	public funcName: string;
	public func: Function | null = null;
	public name: string;
	public regexp: RegExp;
	public canGroup: boolean;
	public canPrivate: boolean;
	// public forward: boolean;
	public help: string | undefined = undefined;
	public isOpen: number;
	public maxLength: number;
	public minLength: number;
	public needAdmin: boolean;
	public weight: number;
	public deleteMSG: number;
	public then: CorpusCB<MessageId>;
	public catch: CorpusCB<ErrorAPIResponse>;

	constructor(plugType: { new(): Plug }, funcName: string, iCorpus: ICorpus) {
		super();
		this.plugType = plugType;
		this.funcName = funcName;
		this.name = iCorpus.name ?? this.toString();
		// noinspection RegExpUnexpectedAnchor
		this.regexp = iCorpus.regexp ?? /$^/;
		this.canGroup = iCorpus.canGroup ?? true;
		this.canPrivate = iCorpus.canPrivate ?? true;
		// this.forward = iCorpus.forward ?? false;
		this.isOpen = iCorpus.isOpen ?? 1;
		this.maxLength = iCorpus.maxLength ?? 100;
		this.minLength = iCorpus.minLength ?? 0;
		this.help = iCorpus.help;
		this.needAdmin = iCorpus.needAdmin ?? false;
		this.weight = iCorpus.weight ?? 10;
		this.deleteMSG = iCorpus.deleteMSG ?? 0;
		this.then = iCorpus.then ?? (() => undefined);
		this.catch = iCorpus.catch ?? (() => Corpus.logger.error(this.toString()));
	}

	public toString(): string {
		return `${this.plugName}.${this.funcName}`;
	}

	public execPrivate(event: CQEvent<"message.private">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case 0:
			return null;
		case 1:
			if (this.canPrivate && this.isOpen > 0 && !this.needAdmin) {
				break;
			}
			return null;
		case 2:
			break;
		}
		return this.regexp.exec(text);
	}

	public execGroup(event: CQEvent<"message.group">, text: string): RegExpExecArray | null {
		switch (this.test(event, text.length)) {
		case 0:
			return null;
		case 1:
			if (this.canGroup && this.isOpen > 0 && !this.needAdmin) {
				break;
			}
			return null;
		case 2:
			break;
		}
		return this.regexp.exec(text);
	}

	public async run(event: CQMessage, exec: RegExpExecArray | null): Promise<CQTag[]> {
		if (exec == null) {
			return [];
		}
		if (this.func == null) {
			const plug: Plug | undefined = Plug.plugs.get(this.plugType);
			if (plug == null) {
				this.isOpen = -1;
				return [CQ.text(`插件${this.plugName}不存在`)];
			}
			const func: canCallType = Reflect.get(plug, this.funcName);
			if (typeof func !== "function") {
				this.isOpen = -1;
				let text = `插件${this}不是方法`;
				this.logger.error(text);
				return [CQ.text(text)];
			}
			this.func = func.bind(plug);
		}
		try {
			if (event.contextType === "message.private" && this.canPrivate ||
					event.contextType === "message.group" && this.canGroup) {
				return await this.func(event, exec);
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

	private test(event: CQMessage, length: number): 0 | 1 | 2 {
		if (event.isCanceled ||
				length < this.minLength || length > this.maxLength ||
				this.isOpen < 0) {
			return 0;
		}
		if (isAdmin(event)) {
			return 2;
		}
		return 1;
	}

	public get plugName() {
		return this.plugType.name;
	}
}

export type CorpusCB<T> = (this: Corpus, value: T, event: CQMessage) => void | PromiseLike<void>
type JSONObject = {
	[key: string]: string | number | boolean | JSONObject | JSONObject[] | null | undefined;
};

export interface JSONable {
	toJSON(): JSONObject;
}
