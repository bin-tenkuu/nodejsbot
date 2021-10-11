import {CQ, CQEvent, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId, PromiseRes, Status} from "go-cqwebsocket/out/Interfaces";
import {adminGroup, CQWS} from "../config/config.json";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {Where} from "../utils/Generators.js";
import {Corpus, Group} from "../utils/Models.js";
import {
	CQMessage, deleteMsg, isAdminGroup, isAdminQQ, isAtMe, onlyText, parseMessage, sendAdminQQ, sendForward,
	sendForwardQuick, sendGroup, sendPrivate,
} from "../utils/Util";
import {default as CQDate} from "./CQData.js";

class CQBot extends Plug {
	public bot: CQWebSocket = new CQWebSocket(CQWS);

	private sendStateInterval?: NodeJS.Timeout;

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
					sendAdminQQ({bot: event.bot}, "已上线");
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
		await sendAdminQQ({bot: this.bot}, "即将下线");
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

	@canCallGroup()
	protected async MemeAI(event: CQEvent<"message.group">, execArray: RegExpExecArray) {
		if (!isAtMe(event)) {
			return [];
		}
		event.stopPropagation();
		const {message_id, user_id} = event.context;
		const cqTags = execArray.input.replace(/吗/g, "")
				.replace(/(?<!\\)不/g, "\\很")
				.replace(/(?<!\\)你/g, "\\我")
				.replace(/(?<!\\)我/g, "\\你")
				.replace(/(?<![没\\])有/g, "\\没有")
				.replace(/(?<!\\)没有/g, "\\有")
				.replace(/[？?]/g, "!")
				.replace(/\\/g, "");
		return [
			CQ.reply(message_id),
			CQ.at(user_id),
			CQ.text(cqTags),
		];
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getHelp() {
		const s: string = CQDate.corpora.filter(c => c.isOpen && !c.needAdmin &&
				c.help !== undefined).map<string>((c) => `${c.name}:${c.help}`).join("\n");
		return [CQ.text(s)];
	}

	@canCallGroup()
	protected async addEXP(event: CQEvent<"message.group">) {
		event.stopPropagation();
		CQDate.getMember(event.context.user_id).addExp(1);
		return [];
	}

	private static async sendCorpusTags(event: CQMessage,
			callback: (this: void, tags: CQTag[], element: Corpus) => void | Promise<any>) {
		const text = onlyText(event);
		let corpus = this.filterCorpus(event, text.length);
		for (const element of corpus) {
			const exec = element.regexp.exec(text);
			if (exec === null) {
				continue;
			}
			const msg = await parseMessage(element.reply, event, exec).catch(e => {
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
		let gen: Generator<Corpus, void, void> = Where(CQDate.corpora, _ => !event.isCanceled);
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
					if (corpus.delMSG > 0) {
						await pro.then(value => {
							deleteMsg(event, value.message_id, corpus.delMSG);
						}, NOP);
					} else {
						await pro.catch(NOP);
					}
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
		let msg = [
			CQ.text(`数据包丢失总数:${state.packet_lost
			}\n接受信息总数:${state.message_received
			}\n发送信息总数:${state.message_sent}`),
		];
		this.bot.send_group_msg(adminGroup, msg).catch(() => {
			if (this.sendStateInterval !== undefined) {
				clearInterval(this.sendStateInterval);
			}
		});
	}
}

export default new CQBot();
