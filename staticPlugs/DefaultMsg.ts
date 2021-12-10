import {Plug} from "../Plug.js";
import {canCall, Corpus, CorpusData} from "@U/Corpus.js";
import {sendAdminQQ} from "@U/Util.js";

export class DefaultMsg extends Plug {
	@canCall({
		name: ".ping",
		regexp: /^[.．。]ping$/i,
		minLength: 4,
		maxLength: 6,
		help: "测试bot是否连接正常",
		weight: 0,
	})
	protected ping = ".pong!";
	@canCall({
		name: ".data",
		regexp: /^[.．。]data$/,
		help: "开发者信息",
		weight: 10,
		deleteMSG: 90,
	})
	protected sendReportInfo2 = "开发者QQ：2938137849\n项目地址github：2938137849/nodejsbot\n轮子github：Mrs4s/go-cqhttp";
	@canCall({
		name: ".ding",
		regexp: /^[.．。]ding$/i,
		minLength: 4,
		maxLength: 6,
		weight: 0,
	})
	protected ding = ".dong!";

	constructor() {
		super(module);
		this.name = "默认消息类";
		this.description = "默认消息类";
	}

	@canCall({
		name: ".report <txt>",
		regexp: /^[.．。]report(?<txt>.+)$/,
		help: "附上消息发送给开发者",
		weight: 6,
		deleteMSG: 10,
	})
	protected sendReport({event, execArray}: CorpusData): string {
		event.stopPropagation();
		const {txt}: { txt?: string } = execArray.groups as { txt?: string } ?? {};
		const {nickname, user_id} = event.context.sender;
		sendAdminQQ(event.bot, `来自 ${nickname} (${user_id}):\n${txt}`).catch(global.NOP);
		return "收到";
	}

	@canCall({
		name: ".(help|帮助)[<id>]",
		regexp: /^[.．。](?:help|帮助)(?<num> ?\d+)?$/,
		forward: true,
		weight: 2,
		minLength: 3,
		maxLength: 10,
		deleteMSG: 30,
	})
	protected getHelp({event, execArray}: CorpusData): string {
		event.stopPropagation();
		const {num} = execArray.groups as { num: string } ?? {};
		const corpuses: Corpus[] = Plug.corpuses.filter(c => c.help != null);
		if (+num > 0) {
			const corpus: Corpus | undefined = corpuses[+num];
			if (corpus != null) {
				const {name, help, regexp, minLength, maxLength, speedLimit, deleteMSG} = corpus;
				return `名称：${name}\n帮助：${help}\n匹配：${regexp}\n长度限制：${minLength}<=%s<=${maxLength}\n${
						deleteMSG > 0 ? `撤回延时：${deleteMSG}毫秒\n` : ""
				}${
						speedLimit > 0 ? `速度限制：1次每${speedLimit}毫秒` : ""
				}`;
			}
		}
		return corpuses.map<string>((c, i) => `${i} :${c.name}`).join("\n");
	}
}

/*
 TODO:
 一个永久免费的图片鉴黄api接口:https://blog.csdn.net/moewang/article/details/113245806
 konachan.net
 lolibooru.moe
 danbooru.me
 yande.re
 */
