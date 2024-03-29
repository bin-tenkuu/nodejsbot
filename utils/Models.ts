export type sauceNAOResult = I.sauceNAOResult;
export type paulzzhTouHouType = I.paulzzhTouHouType;
export type loliconPost = I.loliconPost;
export type setu = I.setu;
export type loliconDate = I.loliconDate;
export type toubiecType = I.toubiecType;
export type pixivCatType = I.pixivCatType;
export type DMXKType = I.DMXKType;
export type YHType = I.YHType;
export type Any = object | string | number | bigint | boolean | symbol | undefined | null | void;

class Modified implements JSONable {
	public is_modified: boolean = false;
	protected _gmt_modified: number = 0;

	public modified() {
		this._gmt_modified = Date.now();
		this.is_modified = true;
	}

	public toJSON(): { gmt_modified: number } {
		return {gmt_modified: this._gmt_modified};
	}

// noinspection JSUnusedGlobalSymbols
	public get gmt_modified(): number {
		return this._gmt_modified;
	}
}

export type IGroup = { readonly id: number, exp: number, gmt_modified: number, is_baned: 0 | 1, invited: number }

export class Group extends Modified implements IGroup, JSONable {
	protected readonly _id: number;
	protected _exp: number = 0;
	protected _is_baned: 0 | 1 = 0;
	protected _invited: number = 0;

	constructor(obj: IGroup | number) {
		super();
		if (typeof obj === "number") {
			this._id = obj;
			return;
		} else {
			this._id = obj.id;
			this._exp = obj.exp;
			this._is_baned = obj.is_baned;
			this._gmt_modified = obj.gmt_modified;
			this._invited = obj.invited;
		}
	}

	public override toJSON(): IGroup {
		return {id: this._id, exp: this._exp, ...super.toJSON(), is_baned: this._is_baned, invited: this._invited};
	}

	public addExp(exp: number): boolean {
		exp += this._exp;
		if (exp < 0) {
			return false;
		}
		this.exp = exp;
		return true;
	}

	public get id() {
		return this._id;
	}

	public get exp(): number {
		return this._exp;
	}

	public set exp(value: number) {
		this._exp = value;
		this.modified();
	}

	public get is_baned(): 0 | 1 {
		return this._is_baned;
	}

	public set is_baned(value: 0 | 1) {
		this._is_baned = value;
		this.modified();
	}

	public get invited(): number {
		return this._invited;
	}

	public set invited(value: number) {
		this._invited = value;
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

	public override toJSON(): IMember {
		return {
			name: this._name,
			...super.toJSON(),
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

export interface JSONable<T extends I.JSONObject = I.JSONObject> {
	toJSON(): T;
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
		[key in string]?: string | number | boolean | JSONObject | JSONObject[] | null;
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
		/**是否 R18（在色图库中的分类，并非作者标识的 R18）*/
		r18: boolean
		/**原图宽度 px*/
		width: number
		/**原图高度 px*/
		height: number
		/**作品标签，包含标签的中文翻译（有的话）*/
		tags: string[]
		/**图片扩展名*/
		ext: string
		/**作品上传日期；时间戳，单位为毫秒*/
		uploadDate: number
		/**包含了所有指定size的图片地址*/
		urls: { [key in loliconSize]: string }
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
	type loliconSize = "original" | "regular" | "small" | "thumb" | "mini"
	export type loliconPost = {
		/**
		 * 0为非 R18，1为 R18，2为混合（在库中的分类，不等同于作品本身的 R18 标识）
		 * @default 0
		 */
		r18?: number
		/**
		 * 一次返回的结果数量，范围为1到100；在指定关键字或标签的情况下，结果数量可能会不足指定的数量
		 * @default 1
		 */
		num?: number
		/**
		 * 返回指定uid作者的作品，最多20个
		 */
		uid?: number[]
		/**返回从标题、作者、标签中按指定关键字模糊匹配的结果，大小写不敏感，性能和准度较差且功能单一，建议使用tag代替*/
		keyword?: string
		/**
		 * 返回匹配指定标签的作品，详见下文
		 */
		tag?: string[]
		/**
		 * 返回指定图片规格的地址，详见下文
		 * @default ["original"]
		 */
		size?: loliconSize[]
		/**
		 * 设置图片地址所使用的在线反代服务，详见下文
		 * @default "i.pixiv.cat"
		 */
		proxy?: string
	};
	export type loliconDate = {
		/**错误信息*/
		error: string
		/**色图数组*/
		data: setu[]
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
