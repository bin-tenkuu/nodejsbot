import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall, canCallRet} from "../utils/Annotation.js";
import {Corpus} from "../utils/Models.js";
import {CQMessage} from "../utils/Util.js";
import {default as CQData} from "./CQData.js";


class CQBotPlugin extends Plug {

	private static getCorpusList(type?: "私聊" | "群聊"): Corpus[] {
		if (type === "私聊") {
			return Plug.corpus.filter(c => c.canPrivate);
		} else if (type === "群聊") {
			return Plug.corpus.filter(c => c.canGroup);
		} else {
			return Plug.corpus;
		}
	}

	private static setBanQQ(text: string, ban: 0 | 1) {
		const matches = text.match(/\d+/g) ?? [];
		for (const value of matches) {
			CQData.setBaned(+value, ban);
		}
		return matches.join("\n");
	}

	constructor() {
		super(module);
		this.name = "QQBot插件系统";
		this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
	}

	@canCall({
		name: ".获取<type>列表<other>",
		regexp: /^\.获取(?<type>[^ ]+)列表(?<other>.*)$/,
		needAdmin: true,
		forward: true,
		weight: 4,
	})
	protected getter(event: CQMessage, execArray: RegExpExecArray): canCallRet {
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
			for (const {id, is_baned} of CQData.getMembers()) {
				if (is_baned === 1) {
					banList.push(id);
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

	@canCall({
		name: ".设置<type> <other>",
		regexp: /^\.设置(?<type>[^ ]+) (?<other>.+)$/,
		needAdmin: true,
		weight: 4,
	})
	protected setter(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
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

	@canCall({
		name: ".语料库<type><open>",
		regexp: /^\.语料库(?<type>[私群]聊)?(?<open>[开关])$/,
		needAdmin: true,
		forward: true,
		weight: 4,
	})
	protected corpusList(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
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
		return CQBotPlugin.getCorpusList(type).map((msg, index) => {
			return {name: msg.name, isOpen: msg.isOpen, index};
		}).filter(msg => msg.isOpen === isOpen).map(({name, index}) => {
			return CQ.text(`${index} :${name}\n`);
		});
	}

	@canCall({
		name: ".语料库<type><open><nums>",
		regexp: /^\.语料库(?<type>[私群]聊)?(?<open>[开关])(?<nums>\s?\d+)$/,
		needAdmin: true,
		weight: 4,
	})
	protected corpusStat(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
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

	@canCall({
		name: ".语料库<type><nums>",
		regexp: /^\.语料库(?<type>[私群]聊)?(?<nums>\s?\d+)$/,
		needAdmin: true,
		weight: 4,
	})
	protected corpusInfo(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
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

	@canCall({
		name: ".插件<other>",
		regexp: /^\.插件(?<other>.*)$/,
		needAdmin: true,
		forward: true,
		weight: 4,
	})
	protected pluginInfo(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
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
}

export default new CQBotPlugin();
