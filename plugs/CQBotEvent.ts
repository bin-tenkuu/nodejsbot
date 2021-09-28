import {CQ, CQTag, CQWebSocket} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {DataCache} from "../utils/repeat.js";
import {CQMessage, sendAdminQQ, sendGroup, sendPrivate} from "../utils/Util.js";
import {default as CQData} from "./CQData.js";

class CQBotEvent extends Plug {
	private header: PartialSocketHandle | undefined = undefined;
	private readonly cache = new DataCache<number, boolean>();

	constructor() {
		super(module);
		this.name = "QQ其他-事件";
		this.description = "QQ的各种事件，非群聊";
		this.version = 0.1;
	}

	async install() {
		this.header = (<CQWebSocket>require("./CQBot.js").default.bot).bind("on", {
			"notice.group_increase": (event) => {
				event.stopPropagation();
				const {operator_id, user_id, sub_type, group_id} = event.context;
				let str;
				if (operator_id === 0) {
					str = `@${user_id} ${sub_type === "approve" ? "欢迎" : "被邀请"}入群`;
				} else {
					str = `@${user_id} 被管理员{@${operator_id}} ${sub_type === "approve" ? "同意" : "邀请"}入群`;
				}
				event.bot.send_group_msg(group_id, str).catch(NOP);
			},
			"notice.group_decrease": (event) => {
				event.stopPropagation();
				const {sub_type, group_id, user_id, operator_id} = event.context;
				if (sub_type === "kick_me") {
					sendAdminQQ(event, `群 ${group_id} 被踢出`);
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
					sendAdminQQ(event, str);
				});
			},
			"request.friend": (event) => {
				event.stopPropagation();
				const {user_id, flag} = event.context;
				sendAdminQQ(event, `${user_id}请求加好友`);
				event.bot.set_friend_add_request(flag, true).catch(NOP);
			},
			"request.group": (event) => {
				event.stopPropagation();
				const {flag, sub_type, group_id} = event.context;
				sendAdminQQ(event, `${group_id}请求入群`);
				event.bot.set_group_add_request(flag, sub_type, true);
			},
			"notice.offline_file": (event) => {
				event.stopPropagation();
				const {name, size, url} = event.context.file;
				sendPrivate(event, [
					CQ.text("上传失败\n"),
					CQ.text(`文件名:${name}\n文件大小:${size}\n文件链接:${url}`),
				]).catch(reason => {
					this.logger.error(reason.msg);
				});
			},
			"notice.client_status": (event) => {
				const {client: {device_name, device_kind}, online} = event.context;
				sendAdminQQ(event, `其他客户端(${online ? "上线" : "下线"}):\n设备名称:${device_name
				}\n设备类型:${device_kind}`);
			},
		});
	}

	async uninstall() {
		require("./CQBot.js").default.bot.unbind(this.header);
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getState(event: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
		const qq: number = event.context.user_id;
		if (event.contextType === "message.group") {
			if (this.cache.has(qq)) {
				return [];
			}
			this.cache.set(qq, true);
		}
		event.stopPropagation();
		const exp = CQData.getMember(+(execArray.groups?.qq ?? qq)).exp;
		return [CQ.at(qq), CQ.text(`${exp}`)];
	}

}

export default new CQBotEvent();
