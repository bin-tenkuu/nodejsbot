let Plugin = require("../Plugin");
let CQ = require("../src/CQ");
const {adminId} = require("../config/config.json");

class CQBotPlugin extends Plugin {
  constructor() {
    super({
      name: "QQBot插件系统",
      description: "QQBot插件系统,QQ管理员命令启用或停用对应插件",
      version: 0.8
    });
  }

  install() {
    return super.install().then(() => {
      return global.PluginLoader.handle(true, "CQBot");
    }).then(() => {
      return global.bot.on("message.private", this.onmessage)
    });
  }

  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot == null) {
        return;
      }
      global.bot.off("message.private", this.onmessage)
    })
  }

  /**
   * event: CQEvent, context: Record<string, any>, tags: CQTag[]
   * @param event
   * @param context
   * @param tags
   */
  onmessage(event, context, tags) {
    let userId = context.user_id;
    if (userId !== adminId) {
      return;
    }
    let message = context.message;
    console.log(message);

    let loader = global.PluginLoader;
    let plugins = loader.plugins;
    let matches;
    switch (true) {
      case (/^\/插件列表/.test(message)):
        let s = plugins.map((value, index) => {
          return `${index}. ${value}`
        }).join("\n");
        global.bot.send("send_private_msg", {
          user_id: adminId,
          message: CQ.text(s)
        })
        break;
      case (/^\/插件(开启)|(关闭)/.test(message)):
        let open = /^\/插件开启/.test(message);
        console.log(open)
        matches = message.match(/\d+(?=\s)?/g);
        if (matches == null) {
          return;
        }
        matches = matches.map(match => plugins[+match])

        loader.handle(open, ...matches).then(() => {
          let text = "对应插件状态:\n" + loader.hasInstall(matches).join("\n");
          global.bot.send("send_private_msg", {
            user_id: adminId,
            message: CQ.text(text)
          })
        })
        break;
    }

  }
}

module.exports = CQBotPlugin;