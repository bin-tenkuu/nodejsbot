import {CQ, CQEvent} from "go-cqwebsocket";
import {CQImage} from "go-cqwebsocket/out/tags";
import {CQText} from "go-cqwebsocket/out/tags.js";
import {Plug} from "../Plug.js";
import {canCallGroup} from "../utils/Annotation.js";
import {RepeatCache} from "../utils/repeat.js";
import CQData from "./CQData.js";

class CQBotRepeat extends Plug {
	private repeatCache = new RepeatCache<string>();

	constructor() {
		super(module);
		this.name = "QQ群聊-复读";
		this.description = "测试用";
		this.version = 0.1;
	}

	@canCallGroup()
	async getRepeat(event: CQEvent<"message.group">) {
		let {group_id, user_id, raw_message} = event.context;
		let node = this.repeatCache.getNode(group_id, raw_message);
		let member = CQData.getMember(event.context.user_id);
		if (node.addUser(user_id)) {
			member.exp--;
			return [];
		}
		if (node.times !== 4) {
			return [];
		}
		if (event.cqTags.some(tag => !(tag instanceof CQText))) {
			return [];
		}
		let msg = event.cqTags.map<string>(tag => {
			if (tag instanceof CQText) {
				return CQBotRepeat.SendRandom(...tag.text);
			} else if (tag instanceof CQImage) {
				return "[图片]";
			} else {
				return "";
			}
		}).join("");
		if (/^[-+$*.]/.test(msg)) {
			return [];
		}
		event.stopPropagation();
		if (msg.length < 4) {
			return [CQ.text(msg)];
		}
		return [CQ.text(CQBotRepeat.SendRandom(""))];

	}

	async install() {}

	async uninstall() {}

	static SendRandom(...str: string[]): string {
		for (let i = str.length - 1; i > 0; i--) {
			let j = (Math.random() * i) | 0;
			[str[i], str[j]] = [str[j], str[i]];
		}
		return str.join("");
	}
}

export default new CQBotRepeat();