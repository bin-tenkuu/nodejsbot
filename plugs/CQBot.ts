import {CQ, CQTag, CQWebSocket} from "go-cqwebsocket";
import {MessageId, Status} from "go-cqwebsocket/out/Interfaces";
import {CQWS} from "../config/config.json";
import {Plug} from "../Plug.js";
import {canCall} from "../utils/Annotation.js";
import {Corpus, Group} from "../utils/Models.js";
import {CQMessage, onlyText, sendAdminGroup, sendGroup, sendPrivate} from "../utils/Util";
import {CQData} from "./CQData.js";

export class CQBot extends Plug {
	private static async sendCorpusTags(event: CQMessage, hrtime: [number, number],
			callback: (this: void, tags: CQTag[], element: Corpus) => Promise<MessageId>) {
		const text = onlyText(event);
		const corpus: string[] = [];
		for (const element of Plug.corpus) {
			const exec: RegExpExecArray | null = event.contextType === "message.private" ?
					element.execPrivate(event, text) : element.execGroup(event, text);
			if (exec === null) {
				continue;
			}
			const msg = await element.run(event, exec).catch<CQTag[]>(e => {
				this.logger.error("语料库转换失败:" + element.name);
				this.logger.error(e);
				return [CQ.text("error:" + element.name + "\n")];
			});
			if (msg.length < 1) {
				continue;
			}
			await callback(msg, element).then(value => {
				element.then(value, event);
			}, reason => {
				element.catch(reason, event);
			}).finally(() => {
				corpus.push(element.name);
			}).catch(NOP);
		}
		if (corpus.length > 0) {
			Plug.hrtime(hrtime, corpus.join(","));
		}
	}

	public bot: CQWebSocket = new CQWebSocket(CQWS);
	private needOpen: number = 0;
	private stateCache = {
		packet_lost: 0, message_sent: 0, message_received: 0,
	};

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.#init();
	}

	async install() {
		return new Promise<void>((resolve, reject) => {
			this.bot.bind("onceAll", {
				"socket.open": (event) => {
					this.logger.info("连接");
					sendAdminGroup(event.bot, "已上线");
					resolve();
					const sendStateInterval = setInterval(() => {
						const message: CQTag[] = this.sendState();
						if (message.length > 0) {
							sendAdminGroup(this.bot, message).catch(() => {
								clearInterval(sendStateInterval);
							});
						}
					}, 1000 * 60 * 60 * 2);
				},
				"socket.close": () => reject(),
			});
			this.bot.once("meta_event.heartbeat", _ => this.getBotState());
			this.bot.connect();
			process.on("beforeExit", () => {
				this.bot.disconnect();
			});
		});
	}

	async uninstall() {
		await sendAdminGroup(this.bot, "即将下线");
		return new Promise<void>((resolve, reject) => {
			this.bot.bind("on", {
				"socket.close": () => {
					this.logger.info("断开");
					resolve();
				},
				"socket.error": () => {
					this.logger.info("断开");
					reject();
				},
			});
			this.bot.disconnect();
		});
	}

	@canCall({
		name: ".状态",
		regexp: /^\.状态$/,
		needAdmin: true,
		weight: 2,
	})
	protected getBotState(): CQTag[] {
		const state: Status["stat"] = this.bot.state.stat;
		this.stateCache.packet_lost = state.packet_lost;
		this.stateCache.message_received = state.message_received;
		this.stateCache.message_sent = state.message_sent + 1;
		return [
			CQ.text(`数据包丢失总数:${state.packet_lost
			}\n接受信息总数:${state.message_received
			}\n发送信息总数:${state.message_sent
			}\n账号掉线次数:${state.lost_times}`),
		];
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
				} else {
					require("child_process").exec("npm stop");
				}
				this.logger.info(`已关闭 [${context.code}]: ${context.reason}`);
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
				let {group_id, user_id} = event.context;
				let group: Group = CQData.get(CQData).getGroup(group_id);
				group.exp++;
				if (group.baned) {
					return;
				}
				if (CQData.get(CQData).getMember(user_id).baned) {
					return;
				}
				CQBot.sendCorpusTags(event, time, async (tags) => {
					// if (!corpus.forward) {
					return sendGroup(event, tags);
					// } else if (tags[0].tagName === "node") {
					// 	return sendForward(event, tags as messageNode);
					// } else {
					// 	return sendForwardQuick(event, tags);
					// }
				}).catch(NOP);
			},
			"message.private": (event) => {
				const time = process.hrtime();
				CQBot.sendCorpusTags(event, time, (tags) => {
					return sendPrivate(event, tags);
				}).catch(NOP);
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
}
