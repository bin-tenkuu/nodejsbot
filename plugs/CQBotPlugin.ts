import {Plug} from "../Plug.js";
import {canCall, CorpusData} from "@U/Corpus.js";
import {ElementAtOrNull} from "@U/Generators.js";
import {sendAdminQQ} from "@U/Util.js";
import {CQData} from "@S/CQData.js";

export class CQBotPlugin extends Plug {
	private readonly CQData = CQData.getInst();

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
	protected async getter({event, execArray}: CorpusData): Promise<string | void> {
		event.stopPropagation();
		const {type} = execArray.groups as { type?: string } ?? {};
		if (type == null) {
			return;
		}
		switch (type) {
		case "群":
			return event.bot.get_group_list().then(list => {
				return list.map(group => `(${group.group_id})${group.group_name}`).join("\n");
			});
		case "好友":
			return event.bot.get_friend_list().then(list => {
				return list.map(friend => `(${friend.user_id})${friend.nickname}:(${friend.remark})`).join("\n");
			});
		case "ban":
			const data = this.CQData;
			const groupBan: number[] = [...data.getGroups()].filter(v => v.baned).map(v => v.id);
			const banList: number[] = [...data.getMembers()].filter(v => v.baned).map(v => v.id);
			return `群：\n${groupBan.join("\n")}\n人：\n${banList.join("\n")}`;
				// case "poke":
				// 	let uin = event.context.self_id;
				// 	return CQData.pokeGroup.map(v => CQ.node(String(v.id), uin, v.text));
		default:
			return;
		}
	}

	@canCall({
		name: ".语料库<open><nums[]>",
		regexp: /^[.．。]语料库(?<open>[开关])(?<nums>[\d ]+)$/,
		needAdmin: true,
		help: "设置语料库状态",
		weight: 4,
	})
	protected corpusStat({event, execArray}: CorpusData): string | void {
		event.stopPropagation();
		const {open, nums} = execArray.groups as { open?: "开" | "关", nums?: string } ?? {};
		if (nums == null) {
			return;
		}
		const number = +nums;
		let s: 0 | 1;
		if (open === "开") {
			s = 1;
		} else if (open === "关") {
			s = 0;
		} else {
			return;
		}
		const element = Plug.corpuses[number];
		if (element == null) {
			return "未知插件ID";
		}
		element.isOpen = s;
		return "语料库变动:" + element.name;
	}

	@canCall({
		name: ".语料库[<nums>]",
		regexp: /^[.．。]语料库(?<nums>\d+)?$/,
		needAdmin: true,
		help: "查看语料库详情",
		weight: 4,
	})
	protected corpusInfo({event, execArray}: CorpusData): string {
		event.stopPropagation();
		const {nums} = execArray.groups as { nums?: string } ?? {};
		if (nums == null) {
			return Plug.corpuses.map(({name, isOpen}, index) => {
				return `${index} (${isOpen}):${name}`;
			}).join("\n");
		}
		const element = Plug.corpuses[+nums];
		if (element == null) {
			return "未知插件ID";
		}
		return JSON.stringify(element, undefined, 1);
	}

	@canCall({
		name: ".插件[<id>]",
		regexp: /^[.．。]插件(?<id> *\d*)$/,
		needAdmin: true,
		forward: true,
		help: "查看插件信息",
		weight: 4,
	})
	protected pluginInfo({event, execArray}: CorpusData): string | void {
		event.stopPropagation();
		const {id} = execArray.groups as { id?: string } ?? {};
		if (id == null) {
			return;
		}
		if (id === "") {
			return [...Plug.plugs.values()].map(({name}, i) => `${i}. ${name}`).join("\n");
		}
		const plugin: Plug | null = ElementAtOrNull(Plug.plugs.values(), +id);
		if (plugin == null) {
			return "未知插件ID";
		}
		return JSON.stringify({
			...plugin.toJSON(),
			"croups": plugin.corpus,
		}, undefined, 1);
	}

	@canCall({
		name: ".禁止[群私]聊",
		regexp: /^[.．。]禁止(?<type>[群私])聊$/,
		needAdmin: true,
		canGroup: false,
		canPrivate: true,
		weight: 4,
	})
	protected setAllCorpusstate({event, execArray}: CorpusData): void {
		event.stopPropagation();
		const {type} = execArray.groups as { type?: string } ?? {};
		switch (type) {
		case "群":
			Plug.corpuses.forEach(v => v.canGroup = false);
			break;
		case "私":
			Plug.corpuses.forEach(v => v.canPrivate = false);
			break;
		default:
			return;
		}
		sendAdminQQ(event.bot, String(type)).catch(global.NOP);
		return;
	}
}
