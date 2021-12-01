import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Annotation.js";
import {lolicon, pixivCat} from "@U/Search.js";
import {sendAdminGroup} from "@U/Util.js";
import {CorpusData} from "@U/Corpus.js";
import {db} from "@U/database.js";

export class CQBotPicture extends Plug {
	private static savePic(pic: PixivPic): void {
		db.sync(db => {
			db.prepare(`INSERT INTO PixivPic(pid, p, uid, r18, url)
            VALUES ($pid, $p, $uid, $r18, $url)
            ON CONFLICT DO NOTHING;`).run(pic);
		});
	}

	private static getRandomPic(r18: 0 | 1): PixivPic {
		return db.sync(db => {
			return <PixivPic>db.prepare<[number]>(`SELECT pid, p, uid, r18, url
            FROM PixivPic
            WHERE r18 = ?
            ORDER BY RANDOM()
            LIMIT 1;`).get(r18);
		});
	}

	public setuSet = new Set<string>();

	constructor() {
		super(module);
		this.name = "QQ群聊-图片相关";
		this.description = "QQ群聊发送各种图片";
	}

	public override async uninstall(): Promise<void> {
		this.logger.info([...this.setuSet].join(" | "));
		return super.uninstall();
	}

	/**获取库中随机色图*/
	@canCall({
		name: "来点[<r18>]色图",
		regexp: /^[来來发發给給l][张張个個幅点點份d](?<r18>r18的?)?[涩色瑟铯s][图圖t]$/i,
		minLength: 4,
		maxLength: 15,
		weight: 5 + 0.1,
		deleteMSG: 20,
		speedLimit: 500,
	})
	protected getRandomSeTu({event, execArray, member}: CorpusData): CQTag[] {
		event.stopPropagation();
		const {r18} = execArray.groups as { r18?: string } ?? {};
		if (!member.addExp(-3)) {
			// return [CQ.text("不够活跃")];
		}
		const pic: PixivPic = CQBotPicture.getRandomPic(r18 == null ? 0 : 1);
		const {author, p, pid, url} = pic;
		const dataMSG: string = `作者：${author}\n原图p${p}：${pid}`;

		return [CQ.image(url), CQ.text(dataMSG)];
	}

	/**获取随机色图*/
	@canCall({
		name: "来点[<r18>][<key>]色图",
		regexp: /^[来來发發给給l][张張个個幅点點份d](?<r18>r18的?)?(?<keyword>.*)?[涩色瑟铯s][图圖t]$/i,
		help: "来点色图，可选参数：r18，key",
		minLength: 4,
		maxLength: 20,
		weight: 5,
		deleteMSG: 20,
		speedLimit: 2000,
	})
	protected async getSeTu({event, execArray, member}: CorpusData): Promise<CQTag[]> {
		event.stopPropagation();
		try {
			const groups = {
				keyword: execArray.groups?.keyword ?? "",
				r18: execArray.groups?.r18 != null,
			};
			if (!member.addExp(-5)) {
				// return [CQ.text("不够活跃")];
			}
			if (this.setuSet.has(groups.keyword)) {
				return [CQ.text("没有，爬")];
			}
			this.logger.info("开始色图", groups);
			const data = await lolicon({
				keyword: groups.keyword,
				r18: +groups.r18,
			});
			const first = data.data[0];
			if (data.data.length <= 0 || first == null) {
				this.logger.warn(`开始色图异常：找不到符合关键字的色图`);
				this.setuSet.add(groups.keyword);
				return [CQ.text("找不到符合关键字的色图")];
			}
			const {author, p, pid, r18, urls: {regular: url}, uid} = first;
			const dataMSG: string = `作者：${author}\n原图p${p}：${pid}`;
			CQBotPicture.savePic({
				pid, r18: <0 | 1>+r18, uid, p, url, author,
			});
			// if (event.contextType === "message.group") {
			// 	const {
			// 		message_id: messageId,
			// 		sender: {nickname: nickname},
			// 	} = event.context;
			// 	sendForward(event, [
			// 		CQ.nodeId(messageId),
			// 		CQ.node(nickname, userId, dataMSG),
			// 		CQ.node(nickname, userId, CQ.escape(first.tags.join("\n"))),
			// 	]).catch(global.NOP);
			// }
			return [CQ.image(url), CQ.text(dataMSG)];
		} catch (reason) {
			sendAdminGroup(event.bot, "色图坏了").catch(global.NOP);
			this.logger.error(reason);
			throw "未知错误,或网络错误";
		}
	}

	/**获取pid对应的p站图片*/
	@canCall({
		name: "看看p站<pid>[-<p>]",
		regexp: /^看{1,2}p站(?<pid>\d+)(?:-(?<p>\d+))?$/,
		help: "看看p站带上pid发送，可选参数：p",
		minLength: 5,
		weight: 5,
		deleteMSG: 90,
		isOpen: 0,
		speedLimit: 2000,
	})
	protected async getPixiv({event, execArray, member}: CorpusData): Promise<CQTag[]> {
		event.stopPropagation();
		try {
			const {pid, p} = (execArray.groups as { pid?: string, p?: string }) ?? {};
			this.logger.debug(`p站图片请求：pid:${pid},p:${p}`);
			if (pid == null) {
				return [CQ.text("pid获取失败")];
			}
			if (!member.addExp(-5)) {
				// return [CQ.text("不够活跃")];
			}
			const data = await pixivCat(pid);
			if (!data.success) {
				this.logger.info(`请求失败`);
				return [CQ.text(data.error)];
			}
			this.logger.info(`多张图片:${data.multiple}`);
			if (data.multiple) {
				const urlsProxy = data.original_urls_proxy;
				const length = urlsProxy.length;
				let ps: number = p == null ? 1 : +p;
				ps = ps >= length ? length - 1 : ps < 1 ? 1 : ps;
				return [
					CQ.text(`总共${length}张图片,这是第${ps},${ps + 1}张`),
					// @ts-ignore
					CQ.image((urlsProxy[ps - 1])),
					// @ts-ignore
					CQ.image((urlsProxy[ps])),
				];
			} else {
				return [CQ.image((data.original_url_proxy))];
			}
		} catch (e) {
			sendAdminGroup(event.bot, "p站图片加载出错").catch(global.NOP);
			this.logger.error(e);
			throw "网络请求错误或内部错误";
		}
	}

	@canCall({
		name: ".色图失败列表",
		regexp: /^[.．。]色图失败列表$/,
		forward: true,
		needAdmin: true,
		weight: 3,
	})
	protected get SetuSet(): CQTag[] {
		return [CQ.text(["", ...this.setuSet].join("\n"))];
	}
}

type PixivPic = {
	pid: number, p: number, uid: number, author: string, r18: 0 | 1, url: string
}
