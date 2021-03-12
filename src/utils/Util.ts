import {CQWebSocket} from "go-cqwebsocket";
import {CQEvent} from "go-cqwebsocket/out/event-bus";
import {GroupMessage} from "go-cqwebsocket/out/Interfaces";
import {at, CQTag} from "go-cqwebsocket/out/tags";

export class ContextEvent {
  bot: CQWebSocket;
  context: GroupMessage;
  tags: CQTag<any>[];
  isAt: boolean;
  isAtMe: boolean;
  text: string;
  event: CQEvent;
  length: number;
  
  constructor(bot: CQWebSocket, context: GroupMessage, tags: CQTag<any>[], event: CQEvent) {
    this.bot = bot;
    this.context = context;
    this.tags = tags;
    this.event = event;
    {
      let at: CQTag<at>[] = tags.filter(tag => tag.tagName === "at");
      this.isAt = at.length >= 1;
      this.isAtMe = at.some(tag => +tag.get("qq") === context.self_id);
    }
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