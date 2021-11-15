import {CQ, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall} from "../utils/Annotation.js";
import {lolicon, pixivCat} from "../utils/Search.js";
import {CQMessage, sendAdminQQ} from "../utils/Util.js";
import {CQData} from "./CQData.js";

export class CQBotPicture extends Plug {
	private static code(code: number) {
		switch (code) {
		case -1  :
			return "内部错误";// 请向 i@loli.best 反馈
		case 0   :
			return "成功";
		case 404 :
			return "找不到符合关键字的色图";
		default:
			return "未知的返回码";
		}
	}

	public setuSet = new Set<string>();
	private usingSeTu: boolean = false;
	private usingSearching: boolean = false;

	constructor() {
		super(module);
		this.name = "QQ群聊-图片相关";
		this.description = "QQ群聊发送各种图片";
	}

	public async uninstall(): Promise<void> {
		this.logger.info([...this.setuSet].join(" | "));
		return super.uninstall();
	}

	/**获取随机色图*/
	@canCall({
		name: "来点[<r18>][<key>]色图",
		regexp: /^[来來发發给給l][张張个個幅点點份d](?<r18>r18的?)?(?<keyword>.*)?[涩色瑟铯s][图圖t]$/i,
		help: "来点色图，可选参数：r18，key",
		minLength: 4,
		weight: 5,
		deleteMSG: 20,
	})
	protected async getSeTu(event: CQMessage, exec: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		if (this.usingSeTu) {
			return [];
		}
		this.usingSeTu = true;
		try {
			const groups = {
				keyword: exec.groups?.keyword ?? "",
				r18: exec.groups?.r18 != null,
			};
			const userId: number = event.context.user_id;
			const member = CQData.getInst().getMember(userId);
			if (!member.addExp(-5)) {
				// return [CQ.text("不够活跃")];
			}
			if (this.setuSet.has(groups.keyword)) {
				return [CQ.text("没有，爬")];
			}
			this.logger.info("开始色图", groups);
			const data = await lolicon({
				size1200: true,
				keyword: groups.keyword,
				r18: +groups.r18,
				num: 1,
			});
			if (data.code !== 0) {
				const message = CQBotPicture.code(data.code);
				this.logger.warn(`开始色图异常：异常返回码(${data.code})：${message}`);
				if (data.code === 404) {
					this.setuSet.add(groups.keyword);
				}
				member.addExp(4);
				return [CQ.text(message)];
			}
			if (data.count < 1) {
				this.logger.warn(`开始色图异常：色图数量不足(${data.count})`);
				return [CQ.text("色图数量不足")];
			}
			const first = data.data[0];
			const dataMSG: string = `作者：${first.author}\n原图p${first.p}：${first.pid}`;
			// if (event.contextType === "message.group") {
			// 	const {
			// 		message_id: messageId,
			// 		sender: {nickname: nickname},
			// 	} = event.context;
			// 	sendForward(event, [
			// 		CQ.nodeId(messageId),
			// 		CQ.node(nickname, userId, dataMSG),
			// 		CQ.node(nickname, userId, CQ.escape(first.tags.join("\n"))),
			// 	]).catch(NOP);
			// }
			return [CQ.image(first.url), CQ.text(dataMSG)];
		} catch (reason) {
			sendAdminQQ(event.bot, "色图坏了").catch(NOP);
			this.logger.error(reason);
			return [CQ.text("未知错误,或网络错误")];
		} finally {
			process.nextTick(() => {
				this.usingSeTu = false;
			});
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
	})
	protected async getPixiv(event: CQMessage, exec: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		if (this.usingSearching) {
			return [];
		}
		this.usingSearching = true;
		try {
			const {pid, p} = (exec.groups as { pid?: string, p?: string }) ?? {};
			this.logger.debug(`p站图片请求：pid:${pid},p:${p}`);
			if (pid == null) {
				return [CQ.text("pid获取失败")];
			}
			const userId: number = event.context.user_id;
			const member = CQData.getInst().getMember(userId);
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
					CQ.image((urlsProxy[ps - 1])),
					CQ.image((urlsProxy[ps])),
				];
			} else {
				return [CQ.image((data.original_url_proxy))];
			}
		} catch (e) {
			sendAdminQQ(event.bot, "p站图片加载出错").catch(NOP);
			this.logger.error(e);
			return [CQ.text("网络请求错误或内部错误")];
		} finally {
			process.nextTick(() => {
				this.usingSearching = false;
			});
		}
	}

	@canCall({
		name: ".色图失败列表",
		regexp: /^[.．。]色图失败列表$/,
		forward: true,
		needAdmin: true,
		weight: 3,
	})
	protected getSetuSet(): CQTag[] {
		return [CQ.text(["", ...this.setuSet].join("\n"))];
	}
}
