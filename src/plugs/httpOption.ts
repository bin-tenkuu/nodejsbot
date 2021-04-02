import http from "http";

import url from "url";
import Plug from "../Plug";
import {logger} from "../utils/logger";

class HttpOption extends Plug {
  private header?: http.Server;
  
  constructor() {
    super(module);
    this.name = "网页指令";
    this.description = "通过网页链接达到控制效果";
    this.version = 0.6;
    
  }
  
  async install() {
    let server = http.createServer((req, res) => {
      res.setHeader("Content-type", "text/html; charset=utf-8");
      logger.info(`${Date()} 网页 '${req.url}' 收到请求`);
      logger.info(`代理:\t${req.headers["x-forwarded-for"]}`);
      logger.info(`远程地址:\t${req.socket.remoteAddress}`);
      if (req.url == null) {
        res.end("<a href='./exit'>http://127.0.0.1:40000/exit</a>");
        return;
      }
      let query = url.parse(req.url);
      if (query.pathname !== "/exit") {
        res.end("<a href='./exit'>http://127.0.0.1:40000/exit</a>");
        return;
      }
      res.end("开始退出");
      Promise.all(Object.values(Plug.plugs).map((p) => p.uninstall())).then(() => {
        logger.info(">>>>>>>>>> 全部卸载完成 <<<<<<<<<<");
        setTimeout(() => {
          process.exit();
        }, 2000);
      });
    }).listen(40000);
    logger.info("快速结束已启动,点击 http://127.0.0.1:40000");
    this.header = server;
  }
  
  async uninstall() {
    this.header?.close();
  }
  
}

export = new HttpOption();