import {CQ, CQEvent, messageNode} from "go-cqwebsocket";
import {at, CQTag} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";
import {logger} from "./logger";

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

export function isAdminQQ({context: {user_id}}: CQEvent<"message.private" | "message.group">): boolean {
  return user_id === adminId;
}

export function isAdminGroup({context: {group_id}}: CQEvent<"message.group">): boolean {
  return group_id === adminGroup;
}

export function sendAdminQQ({bot}: CQEvent<any>, message: CQTag<any>[] | string) {
  if (typeof message === "string") message = [CQ.text(message)];
  bot.send_private_msg(adminId, message).catch(() => {
    logger.warn("管理员消息发送失败");
  });
}

export function sendAdminGroup({bot}: CQEvent<any>, message: CQTag<any>[] | string) {
  if (typeof message === "string") message = [CQ.text(message)];
  bot.send_group_msg(adminGroup, message).catch(() => {
    logger.warn("管理群消息发送失败");
  });
}

export function sendAuto(event: CQEvent<"message.group"> | CQEvent<"message.private">, message: CQTag<any>[] | string) {
  if (typeof message === "string") message = [CQ.text(message)];
  if (event.contextType === "message.group") {
    event.bot.send_group_msg(event.context.group_id, message).catch(() => {
      logger.warn("群消息发送失败");
    });
  } else if (event.contextType === "message.private") {
    event.bot.send_private_msg(event.context.user_id, message).catch(() => {
      logger.warn("私聊消息发送失败");
    });
  }
}

export function sendForward({bot, context: {group_id}}: CQEvent<"message.group">, message: messageNode) {
  return bot.send_group_forward_msg(group_id, message);
}