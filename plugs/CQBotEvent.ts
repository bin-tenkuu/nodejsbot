import {CQ, CQTag} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {AutoWired, canCall} from "@U/Annotation.js";
import {isAdmin, sendAdminGroup, sendAdminQQ, sendGroup, sendPrivate} from "@U/Util.js";
import {CQBot} from "./CQBot.js";
import {Corpus, CorpusData} from "@U/Corpus.js";

export class CQBotEvent extends Plug {
	@AutoWired()
	private declare CQBot: CQBot;
	private header: PartialSocketHandle = {};

	constructor() {
		super(module);
		this.name = "QQ其他-事件";
		this.description = "QQ的各种事件，非群聊";
	}

	public override async install() {
		this.header = this.CQBot.bot.bind("on", {
			"notice.group_increase": (event) => {
				event.stopPropagation();
				const {operator_id, user_id, sub_type} = event.context;
				let str;
				if (operator_id === 0) {
					str = `@${user_id} ${sub_type === "approve" ? "欢迎" : "被邀请"}入群`;
				} else {
					str = `@${user_id} 被管理员{@${operator_id}} ${sub_type === "approve" ? "同意" : "邀请"}入群`;
				}
				sendGroup(event, [CQ.text(str)]).catch(NOP);
			},
			"notice.group_decrease": (event) => {
				event.stopPropagation();
				const {sub_type, group_id, user_id, operator_id} = event.context;
				if (sub_type === "kick_me") {
					sendAdminQQ(event.bot, `群 ${group_id} 被踢出`);
					return;
				}
				let str: string;
				if (sub_type === "kick") {
					str = ` 被 管理员{@${operator_id}} 踢出本群`;
				} else {
					str = ` 主动离开本群`;
				}
				event.bot.get_stranger_info(user_id, false).then(info => {
					str = `@${info.nickname}(${info.user_id})${str}`;
					return sendGroup(event, [CQ.text(str)]);
				}).catch(() => {
					return sendAdminQQ(event.bot, [CQ.text(`来自群：${group_id}\n${str}`)]);
				});
			},
			"request.friend": (event) => {
				event.stopPropagation();
				const {user_id, flag} = event.context;
				sendAdminGroup(event.bot, `${user_id}请求加好友`);
				event.bot.set_friend_add_request(flag, true).catch(NOP);
			},
			"request.group": (event) => {
				event.stopPropagation();
				const {flag, sub_type, group_id} = event.context;
				sendAdminGroup(event.bot, `${group_id}请求入群`);
				event.bot.set_group_add_request(flag, sub_type, true).catch(NOP);
			},
			"notice.offline_file": (event) => {
				event.stopPropagation();
				const {name, size, url} = event.context.file;
				sendPrivate(event, [
					// CQ.text("上传失败\n"),
					CQ.text(`文件名:${name}\n文件大小:${size}\n文件链接:${url}`),
				]).catch(reason => {
					this.logger.error(reason.msg);
				});
			},
			"notice.client_status": (event) => {
				const {client: {device_name, device_kind}, online} = event.context;
				sendAdminGroup(event.bot, `其他客户端(${online ? "上线" : "下线"}):\n设备名称:${device_name
				}\n设备类型:${device_kind}`);
			},
		});
	}

	public override async uninstall() {
		this.CQBot.bot.unbind(this.header);
	}

	@canCall({
		name: ".(help|帮助)<id>",
		regexp: /^[.．。](?:help|帮助)(?<num> *\d*)$/,
		forward: true,
		weight: 2,
		minLength: 3,
		maxLength: 10,
	})
	protected getHelp({event, execArray}: CorpusData): CQTag[] {
		const {num} = execArray.groups as { num: string } ?? {};
		const predicate: (c: Corpus) => boolean = isAdmin(event) ?
				c => c.help != null :
				c => c.isOpen > 0 && !c.needAdmin && c.help != null;
		const corpuses: Corpus[] = Plug.corpuses.filter(predicate);
		if (+num > 0) {
			const corpus: Corpus | undefined = corpuses[+num];
			if (corpus != null) {
				return [CQ.text(`${corpus.name}${corpus.help}`)];
			}
		}
		const s: string = corpuses.map<string>((c, i) => `${i} :${c.name}`).join("\n");
		return [CQ.text(s)];
	}

}
