import {CQ, CQEvent} from "go-cqwebsocket";
import {CQImage} from "go-cqwebsocket/out/tags";
import {CQText} from "go-cqwebsocket/out/tags.js";
import {Plug} from "../Plug.js";
import {canCallGroup} from "../utils/Annotation.js";
import {Equatable, DataCache} from "../utils/repeat.js";
import {default as CQData} from "./CQData.js";

class CQBotRepeat extends Plug {
	private repeatCache = new DataCache<RepeatCache>();

	constructor() {
		super(module);
		this.name = "QQ群聊-复读";
		this.description = "测试用";
		this.version = 0.1;
	}

	@canCallGroup()
	async getRepeat(event: CQEvent<"message.group">) {
		let {group_id, user_id, raw_message} = event.context;
		let node = this.repeatCache.get(group_id, new RepeatCache(raw_message));
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
		let find = event.cqTags.find((tag) => (tag instanceof CQText)) as CQText | undefined;
		if (find === undefined || /^[-+$*.]/.test(find.text)) {
			return [];
		}
		let msg = CQBotRepeat.Random(...event.cqTags.map<string>(tag => {
			if (tag instanceof CQText) {
				return CQBotRepeat.Random(...tag.text).join("");
			} else if (tag instanceof CQImage) {
				return "[图片]";
			} else {
				return "";
			}
		})).join("");
		event.stopPropagation();
		if (msg.length < 4) {
			return [CQ.text(msg)];
		}
		return [CQ.text(CQBotRepeat.Random(...msg).join(""))];
	}

	async install() {}

	async uninstall() {}

	private static Random(...arr: string[]): string[] {
		for (let i = arr.length - 1; i > 0; i--) {
			let j = (Math.random() * i) | 0;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}
}

export class RepeatCache extends Equatable {
	public msg: string;
	public user: Set<number>;

	constructor(msg: string) {
		super();
		this.msg = msg;
		this.user = new Set();
	}

	addUser(user: number): boolean {
		let b: boolean = this.user.has(user);
		b || this.user.add(user);
		return !b;
	}

	get times(): number {
		return this.user.size;
	}

	public equal(obj: any): boolean {
		if (obj instanceof RepeatCache) {
			return this.msg === obj.msg;
		}
		return false;
	}
}
export default new CQBotRepeat();
