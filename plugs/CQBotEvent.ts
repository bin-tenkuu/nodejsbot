import {CQ} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {sendAdminGroup, sendGroup, sendPrivate} from "@U/Util.js";
import {CQBot} from "@P/CQBot.js";
import {CQData} from "@S/CQData.js";

export class CQBotEvent extends Plug {
	private CQBot = CQBot.getInst();
	private CQData = CQData.getInst();
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
				const {operator_id, user_id, sub_type, group_id} = event.context;
				let str;
				if (operator_id === 0) {
					str = `@${user_id} ${sub_type === "approve" ? "欢迎" : "被邀请"}入群`;
				} else {
					str = `@${user_id} 被管理员{@${operator_id}} ${sub_type === "approve" ? "同意" : "邀请"}入群`;
				}
				if (this.CQData.getGroup(group_id).baned) {
					CQBotEvent.logger.info(str);
					return;
				}
				sendGroup(event, [CQ.text(str)]).catch(global.NOP);
			},
			"notice.group_decrease": (event) => {
				event.stopPropagation();
				const {sub_type, group_id, user_id, operator_id} = event.context;
				if (sub_type === "kick_me") {
					sendAdminGroup(event.bot, `群 ${group_id} 被踢出`);
					return;
				}
				const tmp: string = sub_type === "kick" ? ` 被 管理员{@${operator_id}} 踢出本群` : ` 主动离开本群`;
				event.bot.get_stranger_info(user_id, false).then(info => {
					const str = `@${info.nickname}(${info.user_id})${tmp}`;
					if (this.CQData.getGroup(group_id).baned) {
						CQBotEvent.logger.info(str);
						return;
					}
					return sendGroup(event, [CQ.text(str)]);
				}).catch(() => {
					return sendAdminGroup(event.bot, [CQ.text(`来自群：${group_id}\n${tmp}`)]);
				});
			},
			"request.friend": (event) => {
				event.stopPropagation();
				const {user_id, flag} = event.context;
				sendAdminGroup(event.bot, `${user_id}请求加好友`);
				event.bot.set_friend_add_request(flag, true).catch(global.NOP);
			},
			"request.group": (event) => {
				event.stopPropagation();
				const {flag, sub_type, group_id, user_id} = event.context;
				this.CQData.getGroup(group_id).invited = user_id;
				sendAdminGroup(event.bot, `${group_id}请求入群`);
				event.bot.set_group_add_request(flag, sub_type, true).catch(global.NOP);
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
			"notice.group_ban": (event) => {
				const {bot, context: {sub_type, user_id, group_id}} = event;
				if (sub_type === "ban" && user_id === bot.qq) {
					this.CQData.setGroupBaned(group_id, 1);
					sendAdminGroup(bot, `群${group_id}被禁言，已ban`);
				}
			},
		});
	}

	public override async uninstall() {
		this.CQBot.bot.unbind(this.header);
	}
}
