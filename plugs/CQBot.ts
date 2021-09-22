import {CQ, CQEvent, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId, PromiseRes, Status} from "go-cqwebsocket/out/Interfaces";
import {adminGroup, adminId, CQWS} from "../config/config.json";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {Where} from "../utils/Generators.js";
import {
	CQMessage, deleteMsg, isAdminQQ, isAtMe, onlyText, parseMessage, sendForward, sendForwardQuick, sendGroup,
	sendPrivate,
} from "../utils/Util";
import {Corpus, default as members} from "./CQData.js";

class CQBot extends Plug {
	public bot: CQWebSocket;

	private sendStateInterval?: NodeJS.Timeout;

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.version = 0;
		this.bot = new CQWebSocket(CQWS);
		this.init();
	}

	/**发送bot信息*/
	private sendState(state: Status["stat"]) {
		this.bot.send_group_msg(adminGroup, `数据包丢失总数:${state.packet_lost
		}\n接受信息总数:${state.message_received}\n发送信息总数:${state.message_sent}`).catch(() => {
			if (this.sendStateInterval !== undefined) {
				clearInterval(this.sendStateInterval);
			}
		});
	}

	private static sendCorpusTags(event: CQMessage, corpus: Generator<Corpus, void, void>,
			callback: (this: void, tags: CQTag[], element: Corpus) => void) {
		const text = onlyText(event);
		for (const element of corpus) {
			const exec = element.regexp.exec(text);
			if (exec === null) {
				continue;
			}
			if (event.isCanceled) {
				return;
			}
			parseMessage(element.reply, event, exec).catch(e => {
				this.logger.error("语料库转换失败:" + element.name);
				this.logger.error(e);
				return [CQ.text("error:" + element.name + "\n")];
			}).then(msg => {
				callback(msg, element);
			});
			if (event.isCanceled) {
				return;
			}
		}
	}

	@canCallGroup()
	async MemeAI(event: CQEvent<"message.group">, execArray: RegExpExecArray) {
		if (!isAtMe(event)) {
			return [];
		}
		event.stopPropagation();
		const {message_id, user_id} = event.context;
		const cqTags = execArray[0].replace(/吗/g, "")
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
	async getHelp() {
		const s: string = members.corpora.filter(c => c.isOpen && !c.needAdmin &&
				c.help !== undefined).map<string>((c) => `${c.name}:${c.help}`).join("\n");
		return [CQ.text(s)];
	}

	async install() {
		return new Promise<void>((resolve, reject) => {
			this.bot.bind("onceAll", {
				"socket.open": (event) => {
					this.logger.info("连接");
					event.bot.send_private_msg(2938137849, "已上线").catch(NOP);
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
		await this.bot.send_private_msg(adminId, "即将下线").catch(NOP);
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

	private init() {
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
				const userId = event.context.user_id;
				const member = members.getMember(userId);
				member.name = event.context.sender.nickname;
				member.exp++;
				if (members.getBaned(userId)) {
					return;
				}
				CQBot.sendCorpusTags(event, CQBot.filterGroup(event), (tags, element) => {
					if (tags.length < 1) {
						return;
					}
					let pro: PromiseRes<MessageId>;
					if (!element.forward) {
						pro = sendGroup(event, tags);
					} else {
						if (tags[0].tagName === "node") {
							pro = sendForward(event, tags as messageNode);
						} else {
							pro = sendForwardQuick(event, tags);
						}
					}
					if (element.delMSG > 0) {
						pro.then(value => {
							deleteMsg(event, value.message_id, element.delMSG);
						}, NOP);
					} else {
						pro.catch(NOP);
					}
					Plug.hrtime(time);
				});
			},
			"message.private": (event) => {
				const time = process.hrtime();
				CQBot.sendCorpusTags(event, CQBot.filterPrivate(event), (tags) => {
					if (tags.length < 1) {
						return;
					}
					Plug.hrtime(time);
					sendPrivate(event, tags).catch(NOP);
				});
			},
		});
	}

	private static filterPrivate(event: CQEvent<"message.private">): Generator<Corpus, void, void> {
		if (isAdminQQ(event)) {
			return Where(members.corpora, (c) => c.canPrivate);
		}
		return Where(members.corpora, (c) => c.isOpen && !c.needAdmin && c.canPrivate);
	}

	private static filterGroup(event: CQEvent<"message.group">): Generator<Corpus, void, void> {
		if (isAdminQQ(event)) {
			return Where(members.corpora, (c) => c.canGroup);
		}
		return Where(members.corpora, (c) => c.isOpen && !c.needAdmin && c.canGroup);
	}
}

export default new CQBot();
