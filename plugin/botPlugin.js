let Plugin = require("../Plugin");
let {parse: {CQ}} = require("../src/websocket");
const {adminId} = require("../config/config.json");
let {success, fail} = require("../src/utils");

class CQBotPlugin extends Plugin {
  constructor() {
    super({
      name: "QQBot插件系统",
      description: "QQBot插件系统,QQ管理员命令启用或停用对应插件",
      version: 0.8,
    });
    this.header = (event, context, tags) => {
      this.onmessage(event, context, tags);
    }
  }

  install() {
    return super.install().then(() => {
      return global.bot.on("message.private", this.header)
    });
  }

  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.off("message.private", this.header)
      }
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
    // console.log(message);

    let loader = global.PluginLoader;
    let plugins = loader.plugins;
    let bot = global.bot;
    switch (true) {
      case (/^插件列表/.test(message)): {
        let s = loader.hasInstall(...plugins).map((bool, i) => {
          return `${i}. ${bool}<-${plugins[i]}`
        }).join("\n");
        bot.send("send_private_msg", {
          user_id: adminId,
          message: CQ.text(s)
        }).then(success, fail)
        break;
      }
      case (/^插件(开)|(关)/.test(message)): {
        let open = /^插件开/.test(message);
        let matches = message.match(/\d+(?=\s)?/g);
        if (matches == null) {
          return;
        }
        matches = matches.map(match => plugins[+match])

        loader.handle(open, ...matches).then(() => {
          let text = "对应插件状态:\n" + loader.hasInstall(...matches).map((bool, i) => {
            return `${bool}<-${matches[i]}`
          }).join("\n");
          bot.send("send_private_msg", {
            user_id: adminId,
            message: CQ.text(text)
          }).then(success, fail)
        }).catch((err) => {
          console.log(matches)
          console.error(err)
        })
        break;
      }
    }
  }
}

module.exports = CQBotPlugin;