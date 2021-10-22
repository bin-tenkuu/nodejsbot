import {CQ, CQEvent} from "go-cqwebsocket";
import {CQImage, CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCall} from "../utils/Annotation.js";
import {sauceNAO} from "../utils/Search.js";
import {sendAuto} from "../utils/Util.js";

class CQBotSearch extends Plug {

	/**
	 * 解析部分数据
	 * @param {number}index
	 * @param {*}data
	 * @return {string}
	 */
	private static decodeData(index: number, data: { [p: string]: any }) {
		let url: string = data["ext_urls"]?.join("\n") ?? "无";
		switch (index) {
		case 5:
			return `图库:Pixiv\n标题:${data.title}\n画师:${data["member_name"]}\n原图:www.pixiv.net/artworks/${data["pixiv_id"]}`;
		case 9:
			return `图库:Danbooru\n上传者:${data["creator"]}\n角色:${data["characters"]}\n原图:${data["source"]}`;
		case 19:
			return `图库:2D市场\n上传者:${data["creator"]}\n原图:${url}`;
		case 31:
			return `图库:半次元插图\n标题:${data.title}\n画师:${data["member_name"]}\n原图:${url}`;
		case 34:
			return `图库:deviantart\n标题:${data.title}\n画师:${data["author_name"]}\n原图:${url}`;
		case 36:
			return `图库:madokami\n无具体信息`;
		case 37:
			return `图库:露娜汉化\n画师:${data["author"]}\n原图:${url}`;
		case 38:
			const title: string = data["jp_name"] ?? data["eng_name"] ?? data.source;
			url = data["creator"].toString();
			return `图库:ehentai\n标题:${title}\n创建者:${url}`;
		case 41:
			return `图库:Twitter\n上传者:${data["twitter_user_handle"]}\n原图:${url}`;
		default:
			this.logger.info(index, data);
			return `图库id:${index}\n具体信息未解析\n链接:${url}`;
		}
	}

	constructor() {
		super(module);
		this.name = "QQ群聊-搜图";
		this.description = "QQ群聊SauceNAO搜图";
	}

	@canCall({
		name: ".搜图",
		regexp: /^\.搜图$/,
		help: "同时发送图片可以搜图",
		canPrivate: false,
		weight: 5,
		isOpen:false
	})
	protected async getSauceNAO(event: CQEvent<"message.group">): Promise<CQTag[]> {
		const tag: CQTag | undefined = event.cqTags.find(tag => tag instanceof CQImage);
		if (tag === undefined) {
			return [CQ.text("请同时发送图片")];
		}
		const url = tag.get("url");
		if (url === undefined) {
			return [];
		}
		this.logger.info("开始搜图");
		event.stopPropagation();
		const {
			message_id: messageId,
			sender: {nickname: nickName, user_id: userId},
		} = event.context;
		try {
			const result = await sauceNAO(url);
			// console.log(result);
			if (result.results.length === 0) {
				this.logger.info("搜图无结果");
				return [
					CQ.reply(messageId),
					CQ.at(userId),
					CQ.text(`搜图无结果`),
				];
			}
			// const [first, second, third] = result.results;
			// sendForward(event, [
			// 	CQ.nodeId(messageId),
			// 	CQ.node(nickName, userId, [
			// 		CQ.image(first.header.thumbnail),
			// 		CQ.text(`相似度: ${first.header.similarity}%\n`),
			// 		CQ.text(CQBotSearch.decodeData(first.header.index_id, first.data)),
			// 	]),
			// 	CQ.node(nickName, userId, [
			// 		CQ.image(second.header.thumbnail),
			// 		CQ.text(`相似度: ${second.header.similarity}%\n`),
			// 		CQ.text(CQBotSearch.decodeData(second.header.index_id, second.data)),
			// 	]),
			// 	CQ.node(nickName, userId, [
			// 		CQ.image(third.header.thumbnail),
			// 		CQ.text(`相似度: ${third.header.similarity}%\n`),
			// 		CQ.text(CQBotSearch.decodeData(third.header.index_id, third.data)),
			// 	]),
			// ]).catch(() => {
			// 	return sendAuto(event, [
			// 		CQ.reply(messageId),
			// 		CQ.at(userId),
			// 		CQ.text("加载失败或发送失败"),
			// 	]);
			// });
			return [
				CQ.reply(messageId),
				CQ.at(userId),
				CQ.text("有结果，加载中"),
			];
		} catch (e) {
			this.logger.warn("搜图出错");
			this.logger.error(e);
			sendAuto(event, [
				CQ.reply(messageId),
				CQ.at(userId),
				CQ.text(`搜图出错`),
			]);
			return [];
		}
	}
}

export default new CQBotSearch();
