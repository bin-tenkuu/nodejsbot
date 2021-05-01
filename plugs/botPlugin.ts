import {CQ, CQEvent} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {db} from "../utils/database";
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
  
  private run(event: CQEvent<"message.private">) {
    if (!isAdminQQ(event)) return;
    event.stopPropagation();
    let plugins = Object.values(Plug.plugs);
    let text = onlyText(event);
    if (!/^(?:插件|获取|设置)/.test(text)) {return; }
    switch (true) {
      case (/^插件列表/.test(text)):
        return CQBotPlugin.pluginList(plugins, event);
      case (/^插件[开关]/.test(text)):
        return this.pluginStat(plugins, event);
      case (/^插件信息/.test(text)):
        return this.pluginInfo(plugins, event);
      case (/^获取群列表/.test(text)):
        return this.getGroupList(event);
      case (/^获取好友列表/.test(text)):
        return this.getFriendList(event);
      case (/^获取ban列表/.test(text)):
        return this.getBanList(event);
      case (/^设置ban/.test(text)):
        return this.setBanQQ(event, 1);
      case (/^设置unban/.test(text)):
        return this.setBanQQ(event, 0);
      case (/^获取分词/.test(text)):
        return this.getWordSlices(event);
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
  
  private getGroupList(event: CQEvent<"message.private">) {
    event.bot.get_group_list().then(list => {
      let str = list.map(group => {
        return `(${group.group_id})${group.group_name}`;
      }).join("\n");
      sendAdminQQ(event, [CQ.text(str)]);
    });
  }
  
  private getFriendList(event: CQEvent<"message.private">) {
    event.bot.get_friend_list().then(list => {
      let str = list.map(friend => {
        return `(${friend.user_id})${friend.nickname}:(${friend.remark})`;
      }).join("\n");
      sendAdminQQ(event, [CQ.text(str)]);
    });
  }
  
  private getBanList(event: CQEvent<"message.private">) {
    db.start(async db => {
      let list: { id: number }[] = await db.all(`select id from Members where baned = 1`);
      sendAdminQQ(event, [CQ.text(list.map(v => v.id).join("\n"))]);
    }).then(NOP);
  }
  
  private async setBanQQ(event: CQEvent<"message.private">, ban: 0 | 1) {
    let text = onlyText(event);
    let matches = text.match(/\d+(?=\s)?/g) ?? [];
    await db.start(async db => {
      for (const value of matches) {
        await db.run(`update Members set baned = ? where id = ?;`, ban, value);
      }
    });
    sendAdminQQ(event, `已ban:\n${matches.join("\n")}`);
  }
  
  private getWordSlices(event: CQEvent<"message.private">) {
    let text = onlyText(event);
    console.log(event.context.raw_message);
    let matches = /^获取分词 +(.+)$/.exec(text)?.[1] ?? "";
    event.bot.send(".get_word_slices", {
      content: matches,
    }).then(value => {
      sendAdminQQ(event, `分词:\n${value.slices.join("\n")}`);
    }).catch(NOP);
  }
}
