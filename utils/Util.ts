import {CQ, CQEvent, CQTag, CQWebSocket, messageNode} from "go-cqwebsocket";
import {MessageId} from "go-cqwebsocket/out/Interfaces";
import {at} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallGroupType, canCallPrivate, canCallPrivateType} from "./Annotation.js";
import {logger} from "./logger.js";

export function isAt({cqTags}: CQEvent<"message.group">): boolean {
  if (cqTags.length === 0) { return false; }
  return cqTags.some((tag: CQTag<at>) => tag.tagName === "at");
}

export function isAtMe({context: {self_id}, cqTags}: CQEvent<"message.group">): boolean {
  if (cqTags.length === 0) { return false; }
  return cqTags.some((tag: CQTag<at>) => tag.tagName === "at" && +tag.get("qq") === self_id);
}

export function onlyText({context: {raw_message}}: CQEvent<"message.group" | "message.private">): string {
  if (raw_message !== undefined) {
    return raw_message.replace(/\[[^\]]+]/g, "").trim();
  }
  return "";
}

export function isAdminQQ<T>({context: {user_id}}: hasUser<T>): boolean {
  return user_id === adminId;
}

export function isAdminGroup<T>({context: {group_id}}: hasGroup<T>): boolean {
  return group_id === adminGroup;
}

export function sendAdminQQ({bot}: CQEvent<any>, message: CQTag<any>[] | string) {
  if (typeof message === "string") message = CQ.parse(message);
  bot.send_private_msg(adminId, message).catch(() => {
    logger.warn("管理员消息发送失败");
  });
}

export function sendAdminGroup({bot}: CQEvent<any>, message: CQTag<any>[] | string) {
  if (typeof message === "string") message = CQ.parse(message);
  bot.send_group_msg(adminGroup, message).catch(() => {
    logger.warn("管理群消息发送失败");
  });
}

export function sendAuto(event: CQEvent<"message.group"> | CQEvent<"message.private">,
    message: CQTag<any>[] | string) {
  if (event.contextType === "message.group") {
    sendGroup(event, message);
  } else if (event.contextType === "message.private") {
    sendPrivate(event, message);
  }
}

export function sendPrivate<T>({bot, context: {user_id = adminId}}: hasUser<T>,
    message: CQTag<any>[] | string, callback?: (id: MessageId) => void) {
  if (typeof message === "string") message = CQ.parse(message);
  bot.send_private_msg(user_id, message).then(callback, () => {
    bot.send_private_msg(user_id, "私聊消息发送失败").catch(NOP);
    logger.warn("私聊消息发送失败");
  });
}

export function sendGroup<T>({bot, context: {group_id = adminGroup}}: hasGroup<T>,
    message: CQTag<any>[] | string, callback?: (id: MessageId) => void) {
  if (typeof message === "string") message = CQ.parse(message);
  bot.send_group_msg(group_id, message).then(callback, () => {
    bot.send_group_msg(group_id, "群消息发送失败").catch(NOP);
    logger.warn("群消息发送失败");
  });
}

export function sendForward<T>({bot, context: {group_id = adminGroup}}: hasGroup<T>, message: messageNode) {
  return bot.send_group_forward_msg(group_id, message);
}

export function sendForwardQuick<T>({bot, context: {group_id = adminGroup, sender}}: CQEvent<"message.group">,
    message: CQTag<any>[]) {
  let {user_id: userId, nickname: name} = sender;
  let map: messageNode = message.map(tags => CQ.node(name, userId, [tags]));
  return bot.send_group_forward_msg(group_id, map);
}

export function deleteMsg({bot}: CQEvent<any>, id: number, delay: number = 0) {
  if (delay < 0) {
    delay = 0;
  }
  setTimeout(() => {
    bot.delete_msg(id).catch(NOP);
  }, delay * 1000);
}

async function parseFN(body: string, event: CQEvent<"message.group"> | CQEvent<"message.private">,
    exec: RegExpExecArray): Promise<CQTag<any>[]> {
  let [plugName, funName] = body.split(".");
  if (funName === undefined) return [CQ.text(body)];
  let plug: Plug | undefined = Plug.plugs.get(plugName);
  if (plug === undefined) return [CQ.text(`插件${plugName}不存在`)];
  let plugFunc: Function = Reflect.get(plug, funName);
  if (typeof plugFunc !== "function") return [CQ.text(`插件${plugName}的${funName}不是方法`)];
  try {
    if (event.contextType === "message.private" &&
        Reflect.getMetadata(canCallPrivate.name, plugFunc) === true) {
      return (await (plugFunc as canCallPrivateType).call(plug, event, exec) as CQTag<any>[]);
    } else if (event.contextType === "message.group" &&
        Reflect.getMetadata(canCallGroup.name, plugFunc) === true) {
      return (await (plugFunc as canCallGroupType).call(plug, event, exec) as CQTag<any>[]);
    } else {
      logger.info(`不可调用[${body}]`);
      return [CQ.text(`插件${plugName}的${funName}方法不可在${event.contextType}环境下调用`)];
    }
  } catch (e) {
    logger.error("调用出错", e);
    return [CQ.text(`调用出错:` + body)];
  }
}

function parseCQ(body: string, event: CQEvent<"message.group"> | CQEvent<"message.private">,
    exec: RegExpExecArray): CQTag<any> {
  let groups = exec.groups as { [key in string]?: string };
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

export async function parseMessage(template: string, message: CQEvent<"message.group"> | CQEvent<"message.private">,
    execArray: RegExpExecArray): Promise<CQTag<any>[]> {
  let split = template.split(/(?<=])|(?=\[)/);
  let tags: CQTag<any>[] = [];
  for (let str of split) {
    if (str.length === 0) continue;
    if (!str.startsWith("[")) {
      tags.push(CQ.text(str));
      continue;
    }
    let exec = /^\[(?<head>CQ|FN):(?<body>[^\]]+)]$/.exec(str);
    if (exec === null) {
      tags.push(CQ.text(str));
      continue;
    }
    let {head, body} = exec.groups as { head: "CQ" | "FN", body: string };
    switch (head) {
      case "CQ":
        tags.push(parseCQ(body, message, execArray));
        continue;
      case "FN":
        tags.push(...await parseFN(body, message, execArray));
        continue;
      default:
        let never: never = head;
        tags.push(CQ.text(str));
        console.log(never);
    }
  }
  return tags;
}


type hasUser<T> = T extends { bot: CQWebSocket, context: { user_id: number } } ? T : never
type hasGroup<T> = T extends { bot: CQWebSocket, context: { group_id: number } } ? T : never