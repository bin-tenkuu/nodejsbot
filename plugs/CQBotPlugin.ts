import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {default as CQData, Corpus} from "./CQData.js";


class CQBotPlugin extends Plug {

	constructor() {
		super(module);
		this.name = "QQBot插件系统";
		this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
		this.version = 0.8;
	}

	@canCallPrivate()
	@canCallGroup()
	async getter(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {type} = execArray.groups as { type?: string } ?? {};
		if (type === undefined) {
			return [];
		}
		switch (type) {
		case "群":
			return event.bot.get_group_list().then(list => {
				const s = list.map(group => `(${group.group_id})${group.group_name}`).join("\n");
				return [CQ.text(s)];
			});
		case "好友":
			return event.bot.get_friend_list().then(list => {
				const s = list.map(friend => `(${friend.user_id})${friend.nickname}:(${friend.remark})`).join("\n");
				return [CQ.text(s)];
			});
		case "ban":
			const banList: number[] = [];
			for (const memberMap of CQData.memberMap) {
				const [number, {baned}] = memberMap;
				if (baned === 1) {
					banList.push(number);
				}
			}
			const s = banList.join("\n");
			return [CQ.text(s)];
				// case "poke":
				// 	let uin = event.context.self_id;
				// 	return CQData.pokeGroup.map(v => CQ.node(String(v.id), uin, v.text));
		default:
			return [];
		}
	}

	@canCallPrivate()
	@canCallGroup()
	async setter(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {type, other = ""} = execArray.groups as { type?: string, other?: string } ?? {};
		switch (type) {
		case "ban":
			return [CQ.text(CQBotPlugin.setBanQQ(other, 1))];
		case "unban":
			return [CQ.text(CQBotPlugin.setBanQQ(other, 0))];
		default:
			return [];
		}
	}

	/**
	 * { open?: "开" | "关" }
	 */
	@canCallPrivate()
	@canCallGroup()
	async corpusList(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {type, open} = execArray.groups as { type?: "私聊" | "群聊", open?: "开" | "关" } ?? {};
		let isOpen: boolean;
		if (open === "开") {
			isOpen = true;
		} else if (open === "关") {
			isOpen = false;
		} else {
			return [];
		}
		return CQBotPlugin.getCorpusList(type).map((msg, index) =>
				({name: msg.name, isOpen: msg.isOpen, index}),
		).filter(msg => msg.isOpen === isOpen,
		).map(({name, index}) => CQ.text(`${index} :${name}\n`),
		);
	}

	/**
	 * { open?: "开" | "关", nums?: string }
	 */
	@canCallPrivate()
	@canCallGroup()
	async corpusStat(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {
			type, open, nums,
		} = execArray.groups as { type?: "私聊" | "群聊", open?: "开" | "关", nums?: string } ?? {};
		if (nums === undefined) {
			return [];
		}
		const number = +nums;
		let s: boolean;
		if (open === "开") {
			s = true;
		} else if (open === "关") {
			s = false;
		} else {
			return [];
		}
		const element = CQBotPlugin.getCorpusList(type)[number];
		if (element === undefined) {
			return [];
		}
		element.isOpen = s;
		return [CQ.text("回复变动id:" + number)];
	}

	@canCallPrivate()
	@canCallGroup()
	async corpusInfo(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {
			type, nums,
		} = execArray.groups as { type?: "私聊" | "群聊", nums?: string } ?? {};
		if (nums === undefined) {
			return [];
		}
		const element = CQBotPlugin.getCorpusList(type)[+nums];
		if (element === undefined) {
			return [];
		}
		const stringify = JSON.stringify(element, (key, value) => {
			if (value instanceof RegExp) {
				return value.toString();
			}
			return value;
		}, 1);
		return [CQ.text(stringify)];
	}

	@canCallPrivate()
	@canCallGroup()
	async pluginInfo(event: CQEvent<"message.private"> | CQEvent<"message.group">,
			execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		const {other} = execArray.groups as { other?: string } ?? {};
		if (other === undefined) {
			return [];
		}
		if (other === "") {
			let str = [...Plug.plugs.keys()].map((p, i) => `${i}. ${p}`).join("\n");
			return [CQ.text(str)];
		}
		const plugin = Plug.plugs.get(other);
		if (plugin === undefined) {
			return [CQ.text("未知插件名称")];
		}
		const str = JSON.stringify({
			...plugin.toJSON(),
			canAutoCall: [...plugin.canAutoCall],
		}, undefined, 1);
		return [CQ.text(str)];
	}

	@canCallPrivate()
	@canCallGroup()
	async getTQL(): Promise<CQTag[]> {
		if (Math.random() < 0.8) {
			return [];
		}
		return [
			CQ.text("也不看看我是谁呀"),
			CQ.image("https://c2cpicdw.qpic.cn/offpic_new/0//2938137849-553222350-B9DC48A4E06FCA24C40C44D8F1B835F1/0?term=2"),
		];
	}

	private static getCorpusList(type?: "私聊" | "群聊"): Corpus[] {
		if (type === "私聊") {
			return CQData.corpora.filter(c => c.canPrivate);
		} else if (type === "群聊") {
			return CQData.corpora.filter(c => c.canPrivate);
		} else {
			return CQData.corpora;
		}
	}

	private static setBanQQ(text: string, ban: 0 | 1) {
		const matches = text.match(/\d+/g) ?? [];
		for (const value of matches) {
			CQData.getMember(+value).baned = ban;
		}
		return matches.join("\n");
	}
}

export default new CQBotPlugin();