import {CQ, CQEvent} from "go-cqwebsocket";
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
		this.repeatCache.addData(group_id, user_id, raw_message);
		if (event.cqTags.some(tag => !(tag instanceof CQText))) return [];
		let msg = (event.cqTags as CQText[]).map(t => t.text).join("");
		if (/^[-+$%^&*.]/.test(msg)) return [];
		let times: number = this.repeatCache.getTimes(group_id);
		if (times >= 4) {
			event.stopPropagation();
			CQData.getMember(event.context.user_id).exp--;
			if (times > 4) {return [];}
			if (msg.length < 4) {
				return [CQ.text(msg)];
			}
			let slices = await event.bot.get_word_slices(msg);
			return [CQ.text(CQBotRepeat.SendRandom(slices.slices))];
		}
		return [];
	}

	async install() {}

	async uninstall() {}

	static SendRandom(str: string[]): string {
		let i = str.length - 1;
		for (; i > 0; i--) {
			let j = (Math.random() * i) | 0;
			[str[i], str[j]] = [str[j], str[i]];
		}
		return str.join("");
	}
}

export default new CQBotRepeat();