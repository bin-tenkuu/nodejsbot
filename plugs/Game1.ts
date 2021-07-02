import {CQ, CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {dice} from "../utils/COCUtils.js";
import {RepeatCache} from "../utils/repeat.js";
import {default as CQData} from "./CQData.js";

class Game1 extends Plug {
	cache: RepeatCache<Uint16Array>;

	constructor() {
		super(module);
		this.name = "柏青哥游戏";
		this.description = "柏青哥游戏";
		this.version = 0;

		this.cache = new RepeatCache({
			useClones: false,
			stdTTL: 60,
			deleteOnExpire: true,
		});
	}

	@canCallGroup()
	@canCallPrivate()
	async start(event: CQEvent<"message.group"> | CQEvent<"message.private">,
		 execArray: RegExpExecArray): Promise<CQTag[]> {
		// 进入
		event.stopPropagation();
		// 生成数列
		let list = dice(3, 3).list;

		// 创建缓存
		let node = this.cache.get(1, list);

		return [];
	}

	@canCallGroup()
	@canCallPrivate()
	async next(event: CQEvent<"message.group"> | CQEvent<"message.private">,
		 execArray: RegExpExecArray): Promise<CQTag[]> {
		// 进入
		event.stopPropagation();
		// 创建缓存
		let node = this.cache.get(1);
		if (node === undefined) {
			return [];
		}
		// 判断

		// 回复

		return [];
	}

	async install() {
	}

	async uninstall() {
	}
}

export default new Game1();