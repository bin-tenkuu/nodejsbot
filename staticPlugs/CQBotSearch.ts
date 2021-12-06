import {CQ} from "go-cqwebsocket";
import {CQImage, CQTag} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Corpus.js";
import {sauceNAOResult} from "@U/Models.js";
import {sauceNAO} from "@U/Search.js";
import {GroupCorpusData} from "@U/Corpus.js";

export class CQBotSearch extends Plug {

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

	private static toTag(result: sauceNAOResult["results"][number]): CQTag[] {
		if (result == null) {
			return [];
		}
		return [
			CQ.image(result.header.thumbnail),
			CQ.text(`相似度: ${result.header.similarity}%\n`),
			CQ.text(CQBotSearch.decodeData(result.header.index_id, result.data)),
		];
	}

	constructor() {
		super(module);
		this.name = "QQ群聊-搜图";
		this.description = "QQ群聊SauceNAO搜图";
	}

	@canCall({
		name: ".搜图",
		regexp: /^[.．。]搜图$/,
		help: "同时发送图片可以搜图",
		canPrivate: false,
		weight: 5,
		isOpen: 0,
		deleteMSG: 60,
	})
	protected async getSauceNAO({event}: GroupCorpusData): Promise<CQTag[]> {
		// @ts-ignore
		const tag: CQImage | undefined = event.cqTags.find<CQImage>(tag => tag instanceof CQImage);
		if (tag == null) {
			return [CQ.text("请同时发送图片")];
		}
		const url = tag.get("url");
		if (url == null) {
			return [];
		}
		this.logger.info("开始搜图");
		event.stopPropagation();
		const {message_id: messageId, sender: {/*nickname: nickName,*/ user_id: userId}} = event.context;
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
			const [first, second, third] = result.results;
			// sendForward(event, [
			// 	CQ.nodeId(messageId),
			// 	CQ.node(nickName, userId, CQBotSearch.toTag(first)),
			// 	CQ.node(nickName, userId, CQBotSearch.toTag(second)),
			// 	CQ.node(nickName, userId, CQBotSearch.toTag(third)),
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
				// CQ.text("有结果，加载中"),
				...CQBotSearch.toTag(first),
				...CQBotSearch.toTag(second),
				...CQBotSearch.toTag(third),
			];
		} catch (e) {
			this.logger.error("搜图出错");
			this.logger.error(e);
			return [
				CQ.reply(messageId),
				CQ.at(userId),
				CQ.text(`搜图出错`),
			];
		}
	}
}
