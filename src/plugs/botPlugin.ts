import {CQ} from "go-cqwebsocket";
import {adminId} from "../configs/config";
import Plug from "../Plug";
import {PrivateEvent} from "../utils/Util";

class CQBotPlugin extends Plug {
  
  constructor() {
    super(module);
    this.name = "QQBot插件系统";
    this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
    this.version = 0.8;
  }
  
  async install() {
    require("./botPrivate").get(this).push((event: PrivateEvent) => {
      let {
        text: text,
        bot: bot,
      } = event;
      if (!event.isAdmin) return;
      if (!/^插件/.test(text)) return;
      event.stopPropagation();
      let plugins = Object.values(Plug.plugs);
      switch (true) {
        case (/^插件列表/.test(text)): {
          let s = plugins.map((p, i) => `${i}.${p.installed}<-${p.name}`).join("\n");
          bot.send_private_msg(adminId, [
            CQ.text(s),
          ]).catch(() => {});
          return;
        }
        case (/^插件[开关]/.test(text)): {
          let open = /^..开/.test(text);
          let matches = text.match(/\d+(?=\s)?/g);
          if (matches == null) {
            return;
          }
          Promise.all(matches.map(match => plugins[+match]).map(
              open ? async (p) => {
                if (!p.installed) await p.install();
                return `${p.installed}<-${p.name}`;
              } : async (p) => {
                if (p.installed) await p.uninstall();
                return `${p.installed}<-${p.name}`;
              })).then(value => {
            let text = "对应插件状态:\n" + value.join("\n");
            bot.send_private_msg(adminId, [
              CQ.text(text),
            ]).catch(() => {});
          });
          return;
        }
        case (/^插件信息/.test(text)): {
          let matches = text.match(/\d+(?=\s)?/g);
          if (matches == null) {
            return;
          }
          let retText = matches.map(match => plugins[+match]).map((p) => {
            return `插件名字:${p.name}\n  版本:${p.version}\n  描述:${p.description}`;
          }).join("\n\n");
          bot.send_private_msg(adminId, [
            CQ.text(retText),
          ]).catch(() => {});
          return;
        }
        case (/^插件刷新/.test(text)): {
          let loader = require("../PlugLoader").default;
          loader.uninstall().then(() => {
            return loader.install();
          }).then(() => {
            bot.send_private_msg(adminId, "刷新成功")
                .catch(() => {});
          });
          return;
        }
        case (/^插件更新/.test(text)): {
          let matches = text.match(/\d+(?=\s)?/g);
          if (matches == null) {
            return;
          }
          return;
        }
        default:
          return;
          // TODO:消息热重载其他固定代码
      }
    });
  }
  
  async uninstall() {
    require("./botPrivate").del(this);
  }
}

export = new CQBotPlugin();