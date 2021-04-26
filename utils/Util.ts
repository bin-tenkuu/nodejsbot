import {CQEvent} from "go-cqwebsocket";
import {messageNode} from "go-cqwebsocket/out/Interfaces";
import {at, CQTag} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";
import {logger} from "./logger";

export function isAt(event: CQEvent<"message.group">): boolean {
  if (event.contextType !== "message.group") return false;
  if (event.cqTags.length === 0) { return false; }
  return event.cqTags.some((tag: CQTag<at>) => tag.tagName === "at");
}

export function isAtMe(event: CQEvent<"message.group">): boolean {
  if (event.contextType !== "message.group") return false;
  if (event.cqTags.length === 0) { return false; }
  return event.cqTags.some((tag: CQTag<at>) => tag.tagName === "at" && +tag.get("qq") === event.context.self_id);
}

export function onlyText(event: CQEvent<"message.group"> | CQEvent<"message.private">): string {
  if (event.context.raw_message !== undefined) {
    return event.context.raw_message.replace(/\[[^\]]+]/g, "").trim();
  }
  return "";
}

export function isAdminQQ(event: CQEvent<"message.private">): boolean {
  if (event.contextType !== "message.private") return false;
  return event.context.user_id === adminId;
}

export function isAdminGroup(event: CQEvent<"message.group">): boolean {
  if (event.contextType !== "message.group") return false;
  return event.context.user_id === adminGroup;
}

export function sendAdminQQ(event: CQEvent<any>, message: CQTag<any>[] | string) {
  event.bot.send_private_msg(adminId, message).catch(() => {
    logger.warn("管理员消息发送失败");
  });
}

export function sendAdminGroup(event: CQEvent<any>, message: CQTag<any>[] | string) {
  event.bot.send_group_msg(adminGroup, message).catch(() => {
    logger.warn("管理群消息发送失败");
  });
}

export function sendAuto(event: CQEvent<"message.group"> | CQEvent<"message.private">, message: CQTag<any>[] | string) {
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

export function sendForward(event: CQEvent<"message.group">, message: messageNode) {
  return event.bot.send_group_forward_msg(event.context.group_id, message);
}