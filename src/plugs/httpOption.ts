import http from "http";

import url from "url";
import Plug from "../Plug";


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
      console.log(`${Date()} 网页 '${req.url}' 收到请求`);
      if (req.url == null) {
        res.end("http://127.0.0.1:40000/exit");
        return;
      }
      let query = url.parse(req.url);
      if (query.pathname !== "/exit") {
        res.end("http://127.0.0.1:40000/exit");
        return;
      }
      res.end("开始退出");
      Promise.all(Object.values(Plug.plugs).map((p) => p.uninstall())).then(() => {
        console.log(">>>>>>>>>> 全部卸载完成 <<<<<<<<<<");
      }).then(() => {
        setTimeout(() => {
          process.exit();
        }, 2000);
      });
    }).listen(40000);
    console.log("快速结束已启动,点击 http://127.0.0.1:40000");
    this.header = server;
  }
  
  async uninstall() {
    this.header?.close();
  }
  
}

export default new HttpOption();