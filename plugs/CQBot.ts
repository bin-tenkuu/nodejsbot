import {CQ, CQTag, CQWebSocket} from "go-cqwebsocket";
import {Status} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Corpus.js";
import {sendAdminGroup} from "@U/Util.js";
import {Counter} from "@S/Counter.js";
import {CQData} from "@S/CQData.js";
import {sendGroupTags, sendPrivateTags} from "@U/Corpus.js";

const {CQWS} = require("../config/config.json");

export class CQBot extends Plug {
	public bot: CQWebSocket = new CQWebSocket(CQWS);
	private needOpen: number = 0;
	private stateCache: Status["stat"] = <Status["stat"]>{
		packet_lost: 0, message_sent: 0, message_received: 0,
	};

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.#init();
	}

	override async install() {
		return new Promise<void>((resolve, reject) => {
			this.bot.bind("onceAll", {
				"socket.open": (event) => {
					this.logger.info("连接");
					sendAdminGroup(event.bot, "已上线");
					this.sendStateInterval();
					resolve();
				},
				"socket.close": () => reject(),
			});
			this.bot.once("meta_event.heartbeat", ({bot}) => {
				const state: Status["stat"] = bot.state.stat;
				this.stateCache = {...state};
				this.stateCache.message_sent++;
			});
			this.bot.connect();
			process.on("beforeExit", () => {
				this.bot.disconnect();
			});
		});
	}

	override async uninstall() {
		this.needOpen = -1;
		await sendAdminGroup(this.bot, "即将下线");
		return new Promise<void>((resolve) => {
			this.bot.bind("once", {
				"socket.close": () => {
					this.logger.info("断开");
					resolve();
				},
				"socket.error": () => {
					this.logger.info("断开");
					resolve();
				},
			});
			this.bot.disconnect();
		});
	}

	#init() {
		this.bot.bind("on", {
			"socket.error": ({context}) => {
				this.needOpen = -1;
				this.logger.warn(`连接错误[${context.code}]: ${context.reason}`);
			},
			"socket.open": () => {
				this.needOpen = 500;
				this.logger.info(`连接开启`);
			},
			"socket.close": ({context}) => {
				if (this.needOpen >= 0) {
					setTimeout(() => {
						this.bot.reconnect();
					}, this.needOpen);
					this.needOpen = (this.needOpen + 1000) << 1;
					this.logger.info(`重连中 [${context.code}]: ${context.reason}`);
				} else {
					require("child_process").exec("npm stop");
					this.logger.info(`已关闭 [${context.code}]: ${context.reason}`);
				}
			},
		});
		this.bot.messageSuccess = (ret, message) => {
			this.logger.debug(`${message.action}成功：${JSON.stringify(ret.data)}`);
		};
		this.bot.messageFail = (reason, message) => {
			this.logger.error(`${message.action}失败[${reason.retcode}]:${reason.wording}`);
		};
		this.bot.bind("on", {
			"message.group": (event) => {
				const time = process.hrtime();
				const {group_id, user_id} = event.context;
				const data: CQData = CQData.getInst();
				const member = data.getMember(user_id);
				const group = data.getGroup(group_id);
				sendGroupTags({
					event: event, hrtime: time,
					member: member, group: group,
					corpuses: Plug.corpuses,
				}).then(b => {
					b && Counter.getInst().record(event);
				}, global.NOP);
			},
			"message.private": (event) => {
				const time = process.hrtime();
				const {user_id} = event.context;
				const member = CQData.getInst().getMember(user_id);
				sendPrivateTags({
					event: event, hrtime: time,
					member: member,
					corpuses: Plug.corpuses,
				}).then(b => {
					b && Counter.getInst().record(event);
				}, global.NOP);
			},
		});
	}

	/**发送bot信息*/
	private sendState(): CQTag[] {
		const state: Status["stat"] = this.bot.state.stat;
		const str: string[] = [];
		if (state.message_sent <= this.stateCache.message_sent) {
			return [];
		}
		if (state.packet_lost > this.stateCache.packet_lost) {
			str.push(`数据包丢失变化:+${state.packet_lost - this.stateCache.packet_lost}`);
		}
		this.stateCache.packet_lost = state.packet_lost;
		if (state.message_received > this.stateCache.message_received) {
			str.push(`接受信息变化:+${state.message_received - this.stateCache.message_received}`);
		}
		this.stateCache.message_received = state.message_received;
		str.push(`发送信息变化:+${state.message_sent - this.stateCache.message_sent}`);
		this.stateCache.message_sent = state.message_sent + 1;
		return [CQ.text(str.join("\n"))];
	}

	private sendStateInterval() {
		const sendStateInterval = setInterval(() => {
			const message: CQTag[] = this.sendState();
			if (message.length > 0) {
				sendAdminGroup(this.bot, message).catch(() => {
					clearInterval(sendStateInterval);
				});
			}
		}, 1000 * 60 * 60 * 2);
	}

	@canCall({
		name: ".状态",
		regexp: /^[.．。]状态$/,
		needAdmin: true,
		help: "获取当前状态",
		weight: 2,
	})
	protected get BotState(): string {
		const state: Status["stat"] = this.bot.state.stat;
		return `数据包丢失总数:${state.packet_lost
		}\n接受信息总数:${state.message_received
		}\n发送信息总数:${state.message_sent
		}\n账号掉线次数:${state.lost_times}`;
	}
}
