import {CQEvent, message} from "go-cqwebsocket";
import {Plug} from "../Plug";
import {logger} from "../utils/logger";
import {isAtMe, onlyText, sendAuto} from "../utils/Util";

export = new class CQBotTouHou extends Plug {
  private mapper: Map<string, () => Promise<message>>;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-API调用器";
    this.description = "调用API发送消息";
    this.version = 0.1;
    
    this.mapper = new Map();
  }
  
  async install() {
    require("./bot").getGroup(this).push((event: CQEvent<"message.group">) => {
      if (!isAtMe(event)) { return; }
      let exec = /^来点(?<id>.+)/.exec(onlyText(event));
      if (exec == null) { return; }
      let id = (exec.groups as { id?: string }).id;
      if (id === undefined) {return; }
      let func = this.mapper.get(id);
      if (func === undefined) {return;}
      func().then(value => {
        sendAuto(event, value);
      }).catch(() => {
        logger.warn(id + "API调用失败");
      });
    });
  };
  
  async uninstall() {
    require("./bot").delGroup(this);
  }
}
