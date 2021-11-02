import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall} from "../utils/Annotation.js";

export class DefaultMsg extends Plug {
	constructor() {
		super(module);
		this.name = "默认消息类";
		this.description = "默认消息类";
	}

	@canCall({
		name: ".ping",
		regexp: /^\.ping$/i,
		minLength: 4,
		maxLength: 6,
		help: "测试bot是否连接正常",
		weight: 0,
	})
	protected ping(): CQTag[] {
		return [CQ.text(".pong!")];
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
