import {CQWebSocket} from "go-cqwebsocket";
import {CQEvent, GroupMessage, PrivateMessage} from "go-cqwebsocket/out/Interfaces";
import {at, CQTag} from "go-cqwebsocket/out/tags";
import {adminGroup, adminId} from "../config/config.json";

class ContextEvent<T> {
  public readonly bot: CQWebSocket;
  public readonly context: T;
  public readonly tags: CQTag<any>[];
  public readonly text: string;
  public readonly event: CQEvent;
  public readonly length: number;
  
  constructor(bot: CQWebSocket, context: T, tags: CQTag<any>[], event: CQEvent) {
    this.bot = bot;
    this.context = context;
    this.tags = tags;
    this.event = event;
    this.text = tags.filter(tag => tag.tagName === "text").join("").trim();
    this.length = tags.length;
  }
  
  stopPropagation() {
    this.event.stopPropagation();
  }
  
  get canceled() {
    return this.event.isCanceled;
  }
}

export class GroupEvent extends ContextEvent<GroupMessage> {
  public readonly isAt: boolean;
  public readonly isAtMe: boolean;
  public readonly isAdmin: boolean;
  
  constructor(bot: CQWebSocket, context: GroupMessage, tags: CQTag<any>[], event: CQEvent) {
    super(bot, context, tags, event);
    this.isAdmin = context.group_id === adminGroup;
    {
      let at: CQTag<at>[] = tags.filter(tag => tag.tagName === "at");
      this.isAt = at.length >= 1;
      this.isAtMe = at.some(tag => +tag.get("qq") === context.self_id);
    }
  }
}

export class PrivateEvent extends ContextEvent<PrivateMessage> {
  public readonly isAdmin: boolean;
  
  constructor(bot: CQWebSocket, context: PrivateMessage, tags: CQTag<any>[], event: CQEvent) {
    super(bot, context, tags, event);
    this.isAdmin = context.user_id === adminId;
  }
}