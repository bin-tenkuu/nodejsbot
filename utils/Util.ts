import {CQ, CQEvent, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId, PromiseRes} from "go-cqwebsocket/out/Interfaces";
import {CQAt, CQText} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";
import {getLogger} from "./logger.js";

const logger = getLogger("Util");

export type CQMessage = CQEvent<"message.private"> | CQEvent<"message.group">;

export function isAt({cqTags}: CQEvent<"message.group">): boolean {
	if (cqTags.length === 0) {
		return false;
	}
	return cqTags.some((tag: CQTag) => tag instanceof CQAt);
}

export function isAtMe({context: {self_id}, cqTags}: CQEvent<"message.group">): boolean {
	if (cqTags.length === 0) {
		return false;
	}
	return cqTags.some((tag: CQTag) => tag instanceof CQAt && +tag.qq === self_id);
}

export function onlyText({context: {raw_message}}: CQMessage): string {
	if (raw_message !== undefined) {
		return CQ.unescape(raw_message.replace(/\[[^\]]+]/g, "").trim());
	}
	return "";
}

export function isAdminQQ<T>({context: {user_id}}: hasUser<T>): boolean {
	return user_id === adminId;
}

export function isAdminGroup<T>({context: {group_id}}: hasGroup<T>): boolean {
	return group_id === adminGroup;
}

export function sendAdminQQ<T>(bot: CQWebSocket, message: CQTag[] | string): Promise<void> {
	if (typeof message === "string") {
		message = [CQ.text(message)];
	}
	return bot.send_private_msg(adminId, <any>message).then(undefined, () => {
		logger.warn("管理员消息发送失败");
	});
}

export function sendAdminGroup<T>(bot: CQWebSocket, message: CQTag[] | string): Promise<void> {
	if (typeof message === "string") {
		message = [CQ.text(message)];
	}
	return bot.send_group_msg(adminGroup, <any>message).then(undefined, () => {
		logger.warn("管理群消息发送失败");
	});
}

export function sendAuto(event: CQMessage, message: CQTag[] | string): void {
	if (event.contextType === "message.group") {
		sendGroup(event, message).catch(NOP);
	} else if (event.contextType === "message.private") {
		sendPrivate(event, message).catch(NOP);
	}
}

export function sendPrivate<T>({bot, context: {user_id = adminId}}: hasUser<T>,
		message: CQTag[] | string): PromiseRes<MessageId> {
	const msg = typeof message === "string" ? [CQ.text(message)] : message;
	return bot.send_private_msg(user_id, <any>msg).catch(() => {
		return bot.send_private_msg(user_id, cast2Text(msg));
	}).catch(() => {
		return bot.send_private_msg(user_id, "私聊消息发送失败");
	});
}

export function sendGroup<T>({bot, context: {group_id = adminGroup}}: hasGroup<T>,
		message: CQTag[] | string): PromiseRes<MessageId> {
	const msg = typeof message === "string" ? [CQ.text(message)] : message;
	return bot.send_group_msg(group_id, <any>msg).catch(() => {
		return bot.send_group_msg(group_id, cast2Text(msg));
	}).catch(() => {
		return bot.send_group_msg(group_id, "群消息发送失败");
	});
}

export function sendForward<T>({bot, context: {group_id = adminGroup}}: hasGroup<T>,
		message: messageNode): PromiseRes<MessageId> {
	return bot.send_group_forward_msg(group_id, message).catch(() => {
		return bot.send_group_msg(group_id, "合并转发消息发送失败");
	});
}

export function sendForwardQuick<T>({bot, context: {group_id = adminGroup, sender}}: CQEvent<"message.group">,
		message: CQTag[]): PromiseRes<MessageId> {
	const {user_id: userId, nickname: name} = sender;
	const map: messageNode = message.map(tags => CQ.node(name, userId, [tags]));
	return bot.send_group_forward_msg(group_id, map).catch(() => {
		const map: messageNode = message.map(tags => CQ.node(name, userId, cast2Text([tags])));
		return bot.send_group_forward_msg(group_id, map);
	}).catch(() => {
		return bot.send_group_msg(group_id, "合并转发消息发送失败");
	});
}

/**
 * 定时撤回消息
 * @param bot 消息
 * @param id 消息id
 * @param delay 延时时间/s
 */
export function deleteMsg(bot: CQWebSocket, id: number, delay: number = 0): NodeJS.Timeout {
	if (delay < 0) {
		delay = 0;
	}
	return setTimeout(() => {
		bot.delete_msg(id).catch(NOP);
	}, delay * 1000);
}

function cast2Text(message: CQTag[]): CQText[] {
	return message.map<CQText>(tag => tag instanceof CQText ? tag : CQ.text(tag.toString()));
}

type hasUser<T> = T extends { bot: CQWebSocket, context: { user_id: number } } ? T : never;
type hasGroup<T> = T extends { bot: CQWebSocket, context: { group_id: number } } ? T : never;

export function getPRegular(url: string) {
	return url.replace("original", "master").replace(/(?<!1200)\.\w+$/, "_master1200.jpg");
}
