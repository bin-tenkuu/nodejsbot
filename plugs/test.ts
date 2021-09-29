import {Plug} from "../Plug.js";

class test extends Plug {
	constructor() {
		super(module);
		this.name = "测试";
		this.description = "测试用";
	}

	async install() {
		this.logger.info(this.toString());
		throw "但是我拒绝";
	}

	async uninstall() {
		this.logger.info(this.toString());
	}
}

export default new test();

/*
 TODO:
 一个永久免费的图片鉴黄api接口:https://blog.csdn.net/moewang/article/details/113245806
 konachan.net
 lolibooru.moe
 danbooru.me
 yande.re
 */
