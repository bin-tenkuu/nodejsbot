import {CQ, CQEvent} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {isAdminQQ, onlyText, sendAdminQQ} from "../utils/Util";

export = new class CQBotPlugin extends Plug {
  
  constructor() {
    super(module);
    this.name = "QQBot插件系统";
    this.description = "QQBot插件系统,QQ管理员命令启用或停用对应插件";
    this.version = 0.8;
  }
  
  async install() {
    require("./bot").getPrivate(this).push((event: CQEvent<"message.private">) => this.run(event));
  }
  
  async uninstall() {
    require("./bot").delPrivate(this);
  }
  
  run(event: CQEvent<"message.private">) {
    if (!isAdminQQ(event)) return;
    event.stopPropagation();
    let plugins = Object.values(Plug.plugs);
    let text = onlyText(event);
    switch (true) {
      case (/^插件列表/.test(text)):
        return CQBotPlugin.pluginList(plugins, event);
      case (/^插件[开关]/.test(text)):
        return this.pluginStat(plugins, event);
      case (/^插件信息/.test(text)):
        return this.pluginInfo(plugins, event);
      case true:
        return;
        // TODO:消息热重载其他固定代码
    }
  }
  
  private static pluginList(plugins: Plug[], event: CQEvent<"message.private">) {
    let s = plugins.map((p, i) => `${i}.${p.installed}<-${p.name}`).join("\n");
    sendAdminQQ(event, [CQ.text(s)]);
    return;
  }
  
  private pluginStat(plugins: Plug[], event: CQEvent<"message.private">) {
    let text = onlyText(event);
    let open = /^..开/.test(text);
    let matches = text.match(/\d+(?=\s)?/g);
    if (matches == null) return;
    Promise.all(matches.map(match => plugins[+match]).map(async (p) => {
      await (open ? p.install() : p.uninstall());
      return `${p.installed}<-${p.name}`;
    })).then(value => {
      let text = "对应插件状态:\n" + value.join("\n");
      sendAdminQQ(event, [CQ.text(text)]);
    });
    return;
  }
  
  private pluginInfo(plugins: Plug[], event: CQEvent<"message.private">) {
    let matches = onlyText(event).match(/\d+(?=\s)?/g);
    if (matches == null) return;
    let retText = matches.map(match => plugins[+match]).map((p) => {
      return `插件名字:${p.name}\n  版本:${p.version}\n  描述:${p.description}`;
    }).join("\n\n");
    sendAdminQQ(event, [CQ.text(retText)]);
    return;
  }
  
}
