import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Annotation.js";
import {sendAdminQQ} from "@U/Util.js";
import {CorpusData} from "@U/Corpus.js";

export class DefaultMsg extends Plug {
	@canCall({
		name: ".ping",
		regexp: /^[.．。]ping$/i,
		minLength: 4,
		maxLength: 6,
		help: "测试bot是否连接正常",
		weight: 0,
	})
	private ping = [CQ.text(".pong!")];

	@canCall({
		name: ".data",
		regexp: /^[.．。]data$/,
		help: "开发者信息",
		weight: 10,
		deleteMSG: 90,
	})
	private sendReportInfo2 = [
		CQ.text("开发者QQ：2938137849\n"),
		CQ.text("项目地址github：2938137849/nodejsbot\n"),
		CQ.text("轮子github：Mrs4s/go-cqhttp"),
	];

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
	protected sendReport({event, execArray}: CorpusData): CQTag[] {
		const {txt}: { txt?: string } = execArray.groups as { txt?: string } ?? {};
		event.stopPropagation();
		const {nickname, user_id} = event.context.sender;
		sendAdminQQ(event.bot, `来自 ${nickname} (${user_id}):\n${txt}`).catch(NOP);
		return [CQ.text("收到")];
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
