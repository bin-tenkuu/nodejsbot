import Plug from "../Plug";
import {logger} from "../utils/logger";

class test extends Plug {
  constructor() {
    super(module);
    this.name = "测试";
    this.description = "测试用";
    this.version = 0;
  }
  
  async install() {
    logger.info(this.toString());
    throw "但是我拒绝";
  }
  
  async uninstall() {
    logger.info(this.toString());
  }
}

export = new test();
/* TODO:
 毒鸡汤：https://www.iowen.cn/jitang/api/
 彩虹屁：https://chp.shadiao.app/api.php
 */