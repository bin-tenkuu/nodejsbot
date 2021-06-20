import {CQ, CQEvent} from "go-cqwebsocket";
import {CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {distribution} from "../utils/COCUtils.js";
import {default as CQData, SharesData} from "./CQData.js";

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
		let {id} = execArray.groups as { id?: string } ?? {};
		let {user_id} = event.context;
		if (id === undefined) {
			let price: SharesData = Shares.prices;
			let user: SharesData = Shares.getUser(user_id);
			let str: string = Array.from({length: 10}, (_, i) => {
				return `${i}.${Shares.getName(i)}:${price[i]} 持有:${user[i]}`;
			}).join("\n");
			return [CQ.text("当前价格:\n" + str)];
		} else {
			let ids: number = +id;
			let buy: Buy = Shares._buy(user_id, ids, 0);
			return [CQ.text(`${Shares.getName(ids)}价格:${buy.price
			}\n你的持有:${buy.num
			}\n剩余点数:${buy.point
			}`)];
		}
	}

	@canCallGroup()
	@canCallPrivate()
	async getShares(event: CQEvent<"message.group"> | CQEvent<"message.private">,
		 execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {id, num} = execArray.groups as { id?: string, num?: string } ?? {};
		if (id === undefined || num === undefined) return [];
		let {user_id} = event.context;
		let ids: number = +id;
		let b: Buy = Shares._buy(user_id, ids, +num);
		this.autoChange();
		if (b.success) {
			return [CQ.text(`${Shares.getName(ids)}买入成功\n当前价格:${b.price
			}\n你的持有:${b.num
			}\n剩余点数:${b.point
			}\n消耗点数:${b.need}`)];
		}
		return [CQ.text(`${Shares.getName(ids)}买入失败\n当前价格:${b.price
		}\n你的持有:${b.num
		}\n剩余点数:${b.point
		}\n需要点数${b.need}`)];
	}

	private static getUser(qq: number): SharesData {
		let arr: SharesData | undefined = CQData.shares.get(qq);
		if (arr === undefined) {
			arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			CQData.shares.set(qq, arr);
		}
		return arr;
	}

	private static get prices(): SharesData {
		return this.getUser(0);
	}

	private static changePrice() {
		let price = Shares.prices;
		price.forEach((v, i) => {
			let number = distribution(2) * Math.max(v, 9) | 0;
			if ((v < 10)) {
				number += 10 - v;
			}
			price[i] = v + number;
		});
	}

	private autoChange() {
		if (this.auto !== undefined) {
			clearTimeout(this.auto);
		}
		this.auto = setTimeout(() => {
			Shares.changePrice();
		}, 1000 * 30);
	}

	private static _buy(qq: number, id: number, number: number): Buy {
		id |= 0;
		number |= 0;
		/**股票列表*/
		let prices: SharesData = Shares.prices;
		/**股票价格*/
		let price: number = prices[id] | 0;
		/**成员*/
		let member = CQData.getMember(qq);
		/**成员股票列表*/
		let user: SharesData = this.getUser(qq);
		/**需要价格*/
		let p: number = 0 | 0;
		if (number === 0) {
			return {
				success: true,
				price: price,
				num: user[id],
				need: p,
				point: member.exp,
			};
		} else if (number > 0) {
			p = -Shares._calc(price + 1, number) | 0;
			if (member.exp + p < 0) {
				return {
					success: false,
					price: price,
					num: user[id],
					need: p,
					point: member.exp,
				};
			}
		} else if (number < 0) {
			p = Shares._calc(price - 1, -number) | 0;
			if (user[id] + number < 0) {
				return {
					success: false,
					price: price,
					num: user[id],
					need: p,
					point: member.exp,
				};
			}
		}
		member.exp += p;
		user[id] += number;
		price += number;
		prices[id] = price < 1 ? 1 : price;
		return {
			success: true,
			price: prices[id],
			num: user[id],
			need: p,
			point: member.exp,
		};
	}

	private static getName(id: number): string {
		const array = ["牛牛  ", "咕咕  ", "鱼鱼  ", "皮皮虾", "BUG  ", "双马尾", "黑丝袜", "超短裙", "死库水", "萝莉  "];
		return array[id];
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

type Buy = {
	/**成功*/
	success: boolean
	/**价格*/
	price: number,
	/**持有数量*/
	num: number,
	/**需要点数*/
	need: number
	/**剩余点数*/
	point: number
}