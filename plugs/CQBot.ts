import {CQ, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId, PromiseRes, Status} from "go-cqwebsocket/out/Interfaces";
import {CQWS} from "../config/config.json";
import {Plug} from "../Plug.js";
import {Where} from "../utils/Generators.js";
import {Corpus, Group} from "../utils/Models.js";
import {
	CQMessage, isAdminGroup, isAdminQQ, onlyText, sendAdminGroup, sendAdminQQ, sendForward, sendForwardQuick, sendGroup,
	sendPrivate,
} from "../utils/Util";
import {default as CQDate} from "./CQData.js";

class CQBot extends Plug {
	public bot: CQWebSocket = new CQWebSocket(CQWS);

	private sendStateInterval?: NodeJS.Timeout;
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
					sendAdminQQ(event.bot, "已上线");
					resolve();
					this.sendStateInterval = setInterval(() => {
						this.sendState(this.bot.state.stat);
					}, 1000 * 60 * 60 * 2);
				},
				"socket.close": () => reject(),
			});
			this.bot.connect();
			process.on("beforeExit", () => {
				this.bot.disconnect();
			});
		});
	}

	async uninstall() {
		await sendAdminQQ(this.bot, "即将下线");
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

	private static async sendCorpusTags(event: CQMessage,
			callback: (this: void, tags: CQTag[], element: Corpus) => void | Promise<any>) {
		const text = onlyText(event);
		const corpus = this.filterCorpus(event, text.length);
		for (const element of corpus) {
			const exec = element.regexp.exec(text);
			if (exec === null) {
				continue;
			}
			const msg = await element.run(event, exec).catch(e => {
				this.logger.error("语料库转换失败:" + element.name);
				this.logger.error(e);
				return [CQ.text("error:" + element.name + "\n")];
			});
			if (msg.length > 0) {
				await callback(msg, element);
				break;
			}
		}
	}

	private static filterCorpus(event: CQMessage, length: number): Generator<Corpus, void, void> {
		let gen: Generator<Corpus, void, void> = Where(Plug.plugCorpus, _ => !event.isCanceled);
		if (event.contextType === "message.private") {
			gen = Where(gen, (c) => c.canPrivate);
		} else {
			gen = Where(gen, (c) => c.canGroup);
		}
		gen = Where(gen, (c) => length >= c.minLength && length <= c.maxLength);
		if (event.contextType === "message.group" && isAdminGroup(event)) {
			return gen;
		}
		if (isAdminQQ(event)) {
			return gen;
		}
		return Where(gen, (c) => c.isOpen && !c.needAdmin);
	}

	#init() {
		this.bot.bind("on", {
			"socket.error": ({context}) => {
				this.logger.warn(`连接错误[${context.code}]: ${context.reason}`);
			},
			"socket.open": () => {
				this.logger.info(`连接开启`);
			},
			"socket.close": ({context}) => {
				this.logger.info(`已关闭 [${context.code}]: ${context.reason}`);
				require("child_process").exec("npm stop");
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
				let group: Group = CQDate.getGroup(group_id);
				group.exp++;
				if (group.baned) {
					return;
				}
				if (CQDate.getMember(user_id).baned) {
					return;
				}
				CQBot.sendCorpusTags(event, async (tags, corpus) => {
					let pro: PromiseRes<MessageId>;
					if (!corpus.forward) {
						pro = sendGroup(event, tags);
					} else {
						if (tags[0].tagName === "node") {
							pro = sendForward(event, tags as messageNode);
						} else {
							pro = sendForwardQuick(event, tags);
						}
					}
					await pro.then(value => {
						corpus.then(value, event);
					}, reason => {
						corpus.catch(reason, event);
					}).catch(NOP);
					Plug.hrtime(time, corpus.name);
				}).catch(NOP);
			},
			"message.private": (event) => {
				const time = process.hrtime();
				CQBot.sendCorpusTags(event, async (tags, corpus) => {
					await sendPrivate(event, tags).catch(NOP);
					Plug.hrtime(time, corpus.name);
				}).catch(NOP);
			},
		});
	}

	/**发送bot信息*/
	private sendState(state: Status["stat"]) {
		let str = "";
		if (state.message_sent <= this.stateCache.message_sent) {
			return;
		}
		if (state.packet_lost > this.stateCache.packet_lost) {
			str += `\n数据包丢失总数变化:+${state.packet_lost - this.stateCache.packet_lost}`;
		}
		this.stateCache.packet_lost = state.packet_lost;
		if (state.message_received > this.stateCache.message_received) {
			str += `\n接受信息总数变化:+${state.message_received - this.stateCache.message_received}`;
		}
		this.stateCache.message_received = state.message_received;
		str += `\n发送信息总数变化:+${state.message_sent - this.stateCache.message_sent}`;
		this.stateCache.message_sent = state.message_sent + 1;

		sendAdminGroup(this.bot, [CQ.text(str)]).catch(() => {
			if (this.sendStateInterval !== undefined) {
				clearInterval(this.sendStateInterval);
			}
		});
	}
}

export default new CQBot();
