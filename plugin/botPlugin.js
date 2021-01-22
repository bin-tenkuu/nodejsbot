let Plugin = require("../Plugin");
let CQ = require("go-cqwebsocket").Tags.CQ;
const {adminId} = require("../config/config.json");

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
        bot.send_private_msg(adminId, [
          CQ.text(s)
        ])
        break;
      }
      case (/^插件[开关]/.test(message)): {
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
          bot.send_private_msg(adminId, [
            CQ.text(text)
          ])
        }).catch((err) => {
          console.log(matches)
          console.error(err)
        })
        break;
      }
      case (/^插件信息/.test(message)): {
        let matches = message.match(/\d+(?=\s)?/g);
        if (matches == null) {
          return;
        }
        matches = matches.map(match => plugins[+match]);
        loader.getPlugins(...matches).then((plugins) => {
          let text = plugins.map(plugin => {
            return `插件id:${plugin.id}\n  名字:${plugin.name}\n  版本:${plugin.version}\n  描述:${plugin.description}`
          }).join("\n\n");
          bot.send_private_msg(adminId, [
            CQ.text(text)
          ])
        }).catch((err) => {
          console.log(matches)
          console.error(err)
        })
        break;
      }
        // TODO:消息热重载其他固定代码
    }
  }
}

module.exports = CQBotPlugin;