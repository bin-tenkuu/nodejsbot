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
  }

  install() {
    return super.install().then(() => {
      this.header = global.bot.bind("on", {
        "message.private": (event, context) => {
          if (context.user_id !== adminId) {
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
                return `${i}. ${bool}<-${plugins[i]}`;
              }).join("\n");
              bot.send_private_msg(adminId, [
                CQ.text(s),
              ]).then(bot.messageSuccess, bot.messageFail);
              break;
            }
            case (/^插件[开关]/.test(message)): {
              let open = /^插件开/.test(message);
              let matches = message.match(/\d+(?=\s)?/g);
              if (matches == null) {
                return;
              }
              matches = matches.map(match => plugins[+match]);
          
              loader.handle(open, ...matches).then(() => {
                let text = "对应插件状态:\n" + loader.hasInstall(...matches).map((bool, i) => {
                  return `${bool}<-${matches[i]}`;
                }).join("\n");
                bot.send_private_msg(adminId, [
                  CQ.text(text),
                ]).then(bot.messageSuccess, bot.messageFail);
              }).catch((err) => {
                console.log(matches);
                console.error(err);
              });
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
                  return `插件id:${plugin.id}\n  名字:${plugin.name}\n  版本:${plugin.version}\n  描述:${plugin.description}`;
                }).join("\n\n");
                bot.send_private_msg(adminId, [
                  CQ.text(text),
                ]).then(bot.messageSuccess, bot.messageFail);
              }).catch((err) => {
                console.log(matches);
                console.error(err);
              });
              break;
            }
              // TODO:消息热重载其他固定代码
          }
        },
      });
    });
  }
  
  uninstall() {
    return super.uninstall().then(() => {
      if (global.bot) {
        global.bot.unbind(this.header);
      }
    });
  }
}

module.exports = CQBotPlugin;