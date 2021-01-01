let Plugin = require("../Plugin");

class test extends Plugin {
  constructor() {
    super({
      name: "测试",
      description: "测试用",
      version: 0.1
    });
  }

  install() {
    return super.install().then(() => {
      console.log(this.toString())
      throw "出错";
    })
  }

  uninstall() {
    return super.uninstall().then(() => {
      console.log(this.toString())
    })
  }
}

module.exports = test;