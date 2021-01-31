import {CQ} from "go-cqwebsocket";
import {CQEvent} from "go-cqwebsocket/out/event-bus";
import {PrivateMessage, SocketHandle} from "go-cqwebsocket/out/Interfaces";
import Plug from "../Plug";

const {adminId} = require("../../config/config.json");

class CQBotPlugin extends Plug {
  private header?: SocketHandle;
  
  constructor() {
    super(module);
    this.name = "QQBot插件系统";
    this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
    this.version = 0.8;
  }
  
  async install() {
    let def = await import("./bot").then(v => v.default);
    if (!def.bot) return;
    let bot = def.bot;
    this.header = bot.bind("on", {
      "message.private": (event: CQEvent, context: PrivateMessage) => {
        if (context.user_id !== adminId) {
          return;
        }
        let message = context.message;
        let plugins = Object.entries(Plug.plugs);
        switch (true) {
          case (/^插件列表/.test(message)): {
            let s = plugins.map(([, p], i) => {
              return `${i}.${p.installed}<-${p.name}`;
            }).join("\n");
            bot.send_private_msg(adminId, [
              CQ.text(s),
            ]).then(bot.messageSuccess, bot.messageFail);
            return;
          }
          case (/^插件[开关]/.test(message)): {
            let open = /^..开/.test(message);
            let matches = message.match(/\d+(?=\s)?/g);
            if (matches == null) {
              return;
            }
            Promise.all(matches.map(match => plugins[+match]).map(
              open ? async ([, p]) => {
                if (!p.installed) await p.install();
                return `${p.installed}<-${p.name}`;
              } : async ([, p]) => {
                if (p.installed) await p.uninstall();
                return `${p.installed}<-${p.name}`;
              })).then(value => {
              let text = "对应插件状态:\n" + value.join("\n");
              bot.send_private_msg(adminId, [
                CQ.text(text),
              ]).then(bot.messageSuccess, bot.messageFail);
            });
            return;
          }
          case (/^插件信息/.test(message)): {
            let matches = message.match(/\d+(?=\s)?/g);
            if (matches == null) {
              return;
            }
            let text = matches.map(match => plugins[+match]).map(([, p]) => {
              return `插件名字:${p.name}\n  版本:${p.version}\n  描述:${p.description}`;
            }).join("\n\n");
            bot.send_private_msg(adminId, [
              CQ.text(text),
            ]).then(bot.messageSuccess, bot.messageFail);
            break;
          }
          default:
            break;
          // TODO:消息热重载其他固定代码
        }
      },
    });
  }
  
  async uninstall() {
    let def = await import("./bot").then(d => d.default);
    def.bot?.unbind(this.header);
  }
}

export default new CQBotPlugin();