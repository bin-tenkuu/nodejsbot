let Plugin = require("../Plugin");
const http = require("http");
const url = require("url");
const {now, delayExit} = require('../src/utils');

class HttpOption extends Plugin {
  constructor() {
    super({
      id: "HttpOption",
      name: "网页指令",
      description: "通过网页链接达到控制效果",
      version: 0.6
    });
    this.body = {
      "/exit": this.exit,
      "/upgrade": this.httpUpgrade,
      "/httpUpgradePluginLoaderForce": this.httpUpgradeLoader,
      "/httpOpenBot": this.httpOpen,
      "/httpCloseBot": this.httpClose,
      "/pluginList": this.pluginList,
    };
  }

  install() {
    return super.install().then(() => {
      let server = http.createServer((req, res) => {
        res.setHeader("Content-type", "text/html; charset=utf-8");
        console.log(`${now()} ${this.id}:网页 '${req.url}' 收到请求`);
        let query = url.parse(req.url);
        let bodyElement = this.body[query.pathname];
        let result;
        switch (typeof bodyElement) {
          case "function":
            result = bodyElement(req, res);
            break;
          case "string":
            result = bodyElement;
            break;
          default:
            result = Object.keys(this.body).map(value => {
              return `<a href="${value}">http://127.0.0.1:40000${value} </a>`
            }).join(" <br/>\n");
            break;
        }
        if (result instanceof Promise) {
          result.then(() => {
            res.end();
          })
        } else {
          res.end(result);
        }
      }).listen(40000);
      console.log("快速结束已启动,点击 http://127.0.0.1:40000");
      return server;
    }).then((server) => {
      this.header = server;
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      this.header.close()
    })
  }

  exit(req, res) {
    res.end("开始退出");
    let loader = global.PluginLoader;
    loader.handle(false, ...loader.plugins).then(() => {
      console.log(">>>>>>>>>> 全部卸载完成 <<<<<<<<<<");
    }).then(() => {
      delayExit();
    });
  }

  httpUpgrade(req, res) {
    res.end("开始更新插件列表");
    global.PluginLoader.refreshPlugin().then();
  }

  httpOpen(req, res) {
    return global.PluginLoader.handle(true, "CQBot").then()
  }

  httpClose() {
    return global.PluginLoader.handle(false, "CQBot").then();
  }

  pluginList(req, res) {
    // let header = global.PluginLoader.header;
    // let n = {};
    // for (let key in header) {
    //   n[key] = header[key].installed;
    // }
    return JSON.stringify(Object.values(global.PluginLoader.header));
  }

  httpUpgradeLoader(req, res) {
    res.write("开始更新插件加载器");
    let PluginLoader = require("../PluginLoader");
    PluginLoader = PluginLoader.cleanCache(require.resolve("../PluginLoader"));
    return PluginLoader.upgradeSelf().then(() => {
      res.write("更新完成");
    })
  }
}

module.exports = HttpOption;