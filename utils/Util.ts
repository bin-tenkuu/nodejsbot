import {CQ, CQEvent, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId, PromiseRes} from "go-cqwebsocket/out/Interfaces";
import {CQAt, CQText} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallGroupType, canCallPrivate, canCallPrivateType} from "./Annotation.js";
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

export function sendAdminQQ<T>({bot}: hasBot<T>, message: CQTag[] | string): Promise<void> {
	if (typeof message === "string") {
		message = CQ.parse(message);
	}
	return bot.send_private_msg(adminId, <any>message).then(undefined, () => {
		logger.warn("管理员消息发送失败");
	});
}

export function sendAdminGroup<T>({bot}: hasBot<T>, message: CQTag[] | string): Promise<void> {
	if (typeof message === "string") {
		message = CQ.parse(message);
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
	const msg = typeof message === "string" ? CQ.parse(message) : message;
	return bot.send_private_msg(user_id, <any>msg).catch(() => {
		return bot.send_private_msg(user_id, cast2Text(msg));
	}).catch(() => {
		return bot.send_private_msg(user_id, "私聊消息发送失败");
	});
}

export function sendGroup<T>({bot, context: {group_id = adminGroup}}: hasGroup<T>,
		message: CQTag[] | string): PromiseRes<MessageId> {
	const msg = typeof message === "string" ? CQ.parse(message) : message;
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

export function deleteMsg({bot}: CQEvent<any>, id: number, delay: number = 0): NodeJS.Timeout {
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

async function parseFN(body: string, event: CQMessage, exec: RegExpExecArray): Promise<CQTag[]> {
	const [plugName, funName] = body.split(".");
	if (funName === undefined) {
		return [CQ.text(body)];
	}
	const plug: Plug | undefined = Plug.plugs.get(plugName);
	if (plug === undefined) {
		return [CQ.text(`插件${plugName}不存在`)];
	}
	const plugFunc: Function = Reflect.get(plug, funName);
	if (typeof plugFunc !== "function") {
		return [CQ.text(`插件${plugName}的${funName}不是方法`)];
	}
	try {
		if (event.contextType === "message.private" &&
				Reflect.getMetadata(canCallPrivate.name, plugFunc) === true) {
			return (await (plugFunc as canCallPrivateType).call(plug, event, exec) as CQTag[]);
		} else if (event.contextType === "message.group" &&
				Reflect.getMetadata(canCallGroup.name, plugFunc) === true) {
			return (await (plugFunc as canCallGroupType).call(plug, event, exec) as CQTag[]);
		} else {
			logger.info(`不可调用[${body}]`);
			return [CQ.text(`插件${plugName}的${funName}方法不可在${event.contextType}环境下调用`)];
		}
	} catch (e) {
		logger.error("调用出错", e);
		return [CQ.text(`调用出错:` + body)];
	}
}

function parseCQ(body: string, event: CQMessage, exec: RegExpExecArray): CQTag {
	const groups = exec.groups as { [key in string]?: string };
	switch (body) {
	case "reply":
		return CQ.reply(event.context.message_id);
	case "at":
		return CQ.at(event.context.user_id);
	case "tts":
		return groups.tts !== undefined ? CQ.tts(groups.tts) : CQ.text("未获取到tts");
	default:
		return CQ.text(body);
	}
}

export async function parseMessage(template: string, message: CQMessage, execArray: RegExpExecArray): Promise<CQTag[]> {
	const split = template.split(/(?<=])|(?=\[)/);
	const tags: CQTag[] = [];
	for (const str of split) {
		if (str.length === 0) {
			continue;
		}
		if (!str.startsWith("[")) {
			tags.push(CQ.text(str));
			continue;
		}
		const exec = /^\[(?<head>CQ|FN):(?<body>[^\]]+)]$/.exec(str);
		if (exec === null) {
			tags.push(CQ.text(str));
			continue;
		}
		const {head, body} = exec.groups as { head: "CQ" | "FN", body: string };
		switch (head) {
		case "CQ":
			tags.push(parseCQ(body, message, execArray));
			continue;
		case "FN":
			tags.push(...await parseFN(body, message, execArray));
			continue;
		default:
			const never: never = head;
			tags.push(CQ.text(str));
			logger.warn(never);
		}
	}
	return tags;
}

type hasBot<T> = T extends { bot: CQWebSocket } ? T : never;
type hasUser<T> = T extends { bot: CQWebSocket, context: { user_id: number } } ? T : never;
type hasGroup<T> = T extends { bot: CQWebSocket, context: { group_id: number } } ? T : never;

export function getPRegular(url: string) {
	return url.replace("original", "master").replace(/(?<!1200)\.\w+$/, "_master1200.jpg");
}
