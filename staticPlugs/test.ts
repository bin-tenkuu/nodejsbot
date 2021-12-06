import {Plug} from "../Plug.js";
import type {DefaultMsg} from "@S/DefaultMsg.js";
import {LazyRequire} from "@U/Annotation.js";

export class Test extends Plug {
	@LazyRequire("@S/DefaultMsg.js", "DefaultMsg")
	declare private static DefaultMsg: typeof DefaultMsg;

	constructor() {
		super(module);
		this.name = "默认消息类";
		this.description = "默认消息类";
	}

	public override async install(): Promise<void> {
		console.log(Test.DefaultMsg.name);
	}
}
