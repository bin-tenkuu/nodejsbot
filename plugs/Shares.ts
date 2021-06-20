import {CQ, CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {distribution} from "../utils/COCUtils.js";
import {default as CQData} from "./CQData.js";

class Shares extends Plug {
	private auto?: NodeJS.Timeout;

	constructor() {
		super(module);
		this.name = "股票游戏";
		this.description = "股票游戏";
		this.version = 0;
		this.auto = undefined;
	}

	@canCallGroup()
	@canCallPrivate()
	async getSharesPrice(event: CQEvent<"message.group"> | CQEvent<"message.private">,
		 execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {num} = execArray.groups as { num?: string } ?? {};
		let {user_id} = event.context;
		if (num === undefined) {
			return [CQ.text(`当前价格:${Shares.price
			}\n你的持有:${CQData.shares.get(user_id) ?? 0
			}\n剩余点数:${CQData.getMember(user_id).exp
			}`)];
		}
		let b: boolean = Shares._buy(user_id, +num);
		let p: number = Shares.price;
		let n = Shares._calc(p, +num);
		if (b) {
			return [CQ.text(`买入成功\n当前价格:${p
			}\n你的持有:${CQData.shares.get(user_id) ?? 0
			}\n剩余点数:${CQData.getMember(user_id).exp
			}\n消耗点数:${n}`)];
		}
		return [CQ.text(`买入失败\n当前价格:${p
		}\n你的持有:${CQData.shares.get(user_id) ?? 0
		}\n剩余点数:${CQData.getMember(user_id).exp
		}\n需要点数${n}`)];
	}

	private static get price(): number {
		return (CQData.shares.get(0) ?? (Shares.price = 10)) | 0;
	}

	private static set price(value: number) {
		CQData.shares.set(0, value);
	}

	private static changePrice() {
		let price: number = Shares.price | 0;
		let number = distribution(2) * Math.max(price, 9) | 0;
		if ((price < 10)) {
			number += 10 - price;
		}
		Shares.price = price + number;
	}

	private autoChange() {
		this.auto = setTimeout(() => {
			if (!this.installed) {return;}
			Shares.changePrice();
			this.autoChange();
		}, 1000 * 60 * 60);
	}

	private static _buy(id: number, number: number): boolean {
		number |= 0;
		if (number === 0) return true;
		let p: number = Shares.price | 0;
		let member = CQData.getMember(id);
		let n: number = (CQData.shares.get(id) ?? 0) | 0;
		if (number > 0) {
			let price: number = Shares._calc(p, number) | 0;
			if (member.exp < price) return false;
			member.exp -= price;
			CQData.shares.set(id, n + number);
			Shares.price = p + number;
			return true;
		} else if (number < 0) {
			number = -number;
			if (n < number) return false;
			member.exp += Shares._calc(p, number) | 0;
			CQData.shares.set(id, n - number);
			Shares.price = (p -= number) < 1 ? 1 : p;
			return true;
		}
		return false;
	}

	private static _calc(p: number, n: number): number {
		return p * n + (n * (n - 1) >> 1) | 0;
	}

	async install() {
		this.autoChange();
	}

	async uninstall() {
		if (this.auto !== undefined) clearTimeout(this.auto);
	}
}

export default new Shares();