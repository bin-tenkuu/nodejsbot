import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {logger} from "../utils/logger.js";
import {dongManXingKong, lolicon, paulzzhTouHou, toubiec, yingHua} from "../utils/Search.js";
import {endlessGen, getM1200} from "../utils/Util.js";
import CQData from "./CQData.js";


class CQBotRandomPicture extends Plug {
	private readonly callList: (() => Promise<[CQTag]>)[];
	private callSet: Set<number>;
	private generator: Generator<() => Promise<[CQTag]>, never, never>;

	constructor() {
		super(module);
		this.name = "QQ群聊-随机图片";
		this.description = "QQ群聊发送随机图片总类";
		this.version = 0;
		this.callList = [];
		this.callSet = new Set<number>();
		this.generator = endlessGen(this.callList);

		this.init();
	}

	@canCallGroup()
	@canCallPrivate()
	async getRandomPicture(event: CQEvent<"message.private"> | CQEvent<"message.group">): Promise<CQTag[]> {
		event.stopPropagation();
		let userId = event.context.user_id;
		if (this.callSet.has(userId)) { return []; }
		this.callSet.add(userId);
		let member = CQData.getMember(userId);
		if (member.exp < 2) { return [CQ.text("不够活跃,爬")]; }
		member.exp -= 2;
		return await this.generator.next().value();
	}

	async getSeTu(this: void): Promise<[CQTag]> {
		try {
			let data = await lolicon("", false);
			if (data.code !== 0) {
				let message = CQBotRandomPicture.code(data.code);
				logger.warn(`色图异常：异常返回码(${data.code})：${message}`);
				return [CQ.text(message)];
			}
			if (data.count < 1) {
				logger.warn(`色图异常：色图数量不足(${data.count})`);
				return [CQ.text("色图数量不足")];
			}
			let first = data.data[0];
			// logger.info(`剩余次数：${data.quota}||剩余重置时间：${data.quota_min_ttl}s`);
			return [CQ.image(getM1200(first.url))];
		} catch (reason) {
			logger.info(reason);
			return [CQ.text("未知错误,或网络错误")];
		}
	}

	async getTouHouPNG(this: void): Promise<[CQTag]> {
		try {
			let json = await paulzzhTouHou();
			return [CQ.image((json.url))];
		} catch (e) {
			return [CQ.text(`东方图API调用错误`)];
		}
	}

	async getToubiec(this: void): Promise<[CQTag]> {
		try {
			let json = await toubiec();
			return [CQ.image((json.imgurl))];
		} catch (e) {
			return [CQ.text(`toubiec API调用错误`)];
		}
	}

	async getDMXK(this: void): Promise<[CQTag]> {
		try {
			let json = await dongManXingKong();
			return [CQ.image((json.imgurl))];
		} catch (e) {
			return [CQ.text(`DMXK API调用错误`)];
		}
	}

	async getYH(this: void): Promise<[CQTag]> {
		try {
			let json = await yingHua();
			return [CQ.image((json.imgurl))];
		} catch (e) {
			return [CQ.text(`DMXK API调用错误`)];
		}
	}

	private static code(code: number) {
		switch (code) {
			case -1  :
				return "内部错误";// 请向 i@loli.best 反馈
			case 0   :
				return "成功";
			case 401 :
				return "APIKEY 不存在或被封禁";
			case 403 :
				return "由于不规范的操作而被拒绝调用";
			case 404 :
				return "找不到符合关键字的色图";
			case 429 :
				return "达到调用额度限制";
			default:
				return "未知的返回码";
		}
	}

	init() {
		this.callList.push(
			 this.getSeTu,
			 this.getTouHouPNG,
			 this.getToubiec,
			 this.getDMXK,
			 this.getYH,
		);
		setInterval(() => {
			this.callSet.clear();
		}, 1000 * 60 * 10);
	}

}

export default new CQBotRandomPicture();
