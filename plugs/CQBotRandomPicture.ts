import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {dongManXingKong, lolicon, paulzzhTouHou, toubiec, yingHua} from "../utils/Search.js";
import {endlessGen, getPRegular} from "../utils/Util.js";
import {default as CQData} from "./CQData.js";


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
		if (this.callSet.has(userId)) {
			return [];
		}
		this.callSet.add(userId);
		let member = CQData.getMember(userId);
		if (member.exp < 2) {
			return [CQ.text("不够活跃")];
		}
		member.exp -= 2;
		return await this.generator.next().value();
	}

	private static async getSeTu(this: void): Promise<[CQTag]> {
		try {
			let data = await lolicon();
			if (data.code !== 0) {
				let message = CQBotRandomPicture.code(data.code);
				CQBotRandomPicture.logger.warn(`色图异常：异常返回码(${data.code})：${message}`);
				return [CQ.text(message)];
			}
			if (data.count < 1) {
				CQBotRandomPicture.logger.warn(`色图异常：色图数量不足(${data.count})`);
				return [CQ.text("色图数量不足")];
			}
			let first = data.data[0];
			return [CQ.image(getPRegular(first.url))];
		} catch (reason) {
			CQBotRandomPicture.logger.info(reason);
			return [CQ.text("未知错误,或网络错误")];
		}
	}

	private static async getTouHouPNG(this: void): Promise<[CQTag]> {
		try {
			let json = await paulzzhTouHou();
			return [CQ.image((json.url))];
		} catch (e) {
			return [CQ.text(`东方图API调用错误`)];
		}
	}

	private static async getToubiec(this: void): Promise<[CQTag]> {
		try {
			let json = await toubiec();
			return [CQ.image((json.imgurl))];
		} catch (e) {
			return [CQ.text(`toubiec API调用错误`)];
		}
	}

	private static async getDMXK(this: void): Promise<[CQTag]> {
		try {
			let json = await dongManXingKong();
			return [CQ.image((json.imgurl))];
		} catch (e) {
			return [CQ.text(`DMXK API调用错误`)];
		}
	}

	private static async getYH(this: void): Promise<[CQTag]> {
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
		case 404 :
			return "找不到符合关键字的色图";
		default:
			return "未知的返回码";
		}
	}

	private init() {
		this.callList.push(
				CQBotRandomPicture.getSeTu,
				CQBotRandomPicture.getTouHouPNG,
				CQBotRandomPicture.getToubiec,
				CQBotRandomPicture.getDMXK,
				CQBotRandomPicture.getYH,
		);
		setInterval(() => {
			this.callSet.clear();
		}, 1000 * 60 * 10);
	}

}

export default new CQBotRandomPicture();
