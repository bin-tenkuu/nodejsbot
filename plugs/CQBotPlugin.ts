import {CQ, CQTag, CQWebSocket} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall, canCallRet} from "@U/Annotation.js";
import {ElementAtOrNull} from "@U/Generators.js";
import {sendAdminQQ} from "@U/Util.js";
import {CQData} from "@S/CQData.js";
import {CorpusData} from "@U/Corpus.js";

export class CQBotPlugin extends Plug {
	private static method: Readonly<CQWebSocket> = CQWebSocket.prototype;

	constructor() {
		super(module);
		this.name = "QQBot插件系统";
		this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
	}

	@canCall({
		name: ".获取<type>列表",
		regexp: /^[.．。]获取(?<type>[^ ]+)列表$/,
		needAdmin: true,
		forward: true,
		weight: 4,
	})
	protected getter({event, execArray}: CorpusData): canCallRet {
		event.stopPropagation();
		const {type} = execArray.groups as { type?: string } ?? {};
		if (type == null) {
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
			const data: CQData = CQData.getInst();
			const groupBan: number[] = [...data.getGroups()].filter(v => v.baned).map(v => v.id);
			const banList: number[] = [...data.getMembers()].filter(v => v.baned).map(v => v.id);
			return [CQ.text(`群：\n${groupBan.join("\n")}\n人：\n${banList.join("\n")}`)];
				// case "poke":
				// 	let uin = event.context.self_id;
				// 	return CQData.pokeGroup.map(v => CQ.node(String(v.id), uin, v.text));
		default:
			return [];
		}
	}

	@canCall({
		name: ".语料库",
		regexp: /^[.．。]语料库$/,
		needAdmin: true,
		forward: true,
		maxLength: 10,
		help: "查看全部语料库状态",
		weight: 4,
	})
	protected corpusList({event}: CorpusData): CQTag[] {
		event.stopPropagation();
		return Plug.corpuses.map((msg, index) => {
			return {name: msg.name, isOpen: msg.isOpen, index};
		}).map(({name, index, isOpen}) => {
			return CQ.text(`${index} (${isOpen}):${name}\n`);
		});
	}

	@canCall({
		name: ".语料库<open><nums[]>",
		regexp: /^[.．。]语料库(?<open>[开关])(?<nums>[\d ]+)$/,
		needAdmin: true,
		help: "设置语料库状态",
		weight: 4,
	})
	protected corpusStat({event, execArray}: CorpusData): CQTag[] {
		event.stopPropagation();
		const {open, nums} = execArray.groups as { open?: "开" | "关", nums?: string } ?? {};
		if (nums == null) {
			return [];
		}
		const number = +nums;
		let s: 0 | 1;
		if (open === "开") {
			s = 1;
		} else if (open === "关") {
			s = 0;
		} else {
			return [];
		}
		const element = Plug.corpuses[number];
		if (element == null) {
			return [];
		}
		element.isOpen = s;
		return [CQ.text("回复变动id:" + number)];
	}

	@canCall({
		name: ".语料库<nums>",
		regexp: /^[.．。]语料库(?<nums>\d+)$/,
		needAdmin: true,
		help: "查看语料库详情",
		weight: 4,
	})
	protected corpusInfo({event, execArray}: CorpusData): CQTag[] {
		event.stopPropagation();
		const {nums} = execArray.groups as { nums?: string } ?? {};
		if (nums == null) {
			return [];
		}
		const element = Plug.corpuses[+nums];
		if (element == null) {
			return [];
		}
		const stringify = JSON.stringify(element, undefined, 1);
		return [CQ.text(stringify)];
	}

	@canCall({
		name: ".插件[<id>]",
		regexp: /^[.．。]插件(?<id> *\d*)$/,
		needAdmin: true,
		forward: true,
		help: "查看插件信息",
		weight: 4,
	})
	protected pluginInfo({event, execArray}: CorpusData): CQTag[] {
		event.stopPropagation();
		const {id} = execArray.groups as { id?: string } ?? {};
		if (id == null) {
			return [];
		}
		if (id === "") {
			const str = [...Plug.plugs.values()].map(({name}, i) => `${i}. ${name}`).join("\n");
			return [CQ.text(str)];
		}
		const plugin: Plug | null = ElementAtOrNull(Plug.plugs.values(), +id);
		if (plugin == null) {
			return [CQ.text("未知插件ID")];
		}
		const str = JSON.stringify({
			...plugin.toJSON(),
			"croups": plugin.corpus,
		}, undefined, 1);
		return [CQ.text(str)];
	}

	@canCall({
		name: ".模式",
		regexp: /^[.．。]模式(?<type>风控|正常)$/,
		needAdmin: true,
		canGroup: false,
		canPrivate: true,
		weight: 4,
	})
	protected setAllCorpusstate({event, execArray}: CorpusData): CQTag[] {
		event.stopPropagation();
		const {type} = execArray.groups as { type?: string } ?? {};
		switch (type) {
		case "风控":
			event.bot.send_group_msg = () => Promise.resolve({message_id: 0});
			break;
		case "正常":
			event.bot.send_group_msg = CQBotPlugin.method.send_group_msg;
			break;
		}
		sendAdminQQ(event.bot, String(type)).catch(NOP);
		return [];
	}
}
