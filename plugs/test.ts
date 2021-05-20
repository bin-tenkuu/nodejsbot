import {Plug} from "../Plug.js";
import {logger} from "../utils/logger.js";

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

export default new test;