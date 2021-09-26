import {CQ, CQEvent} from "go-cqwebsocket";
import {CQImage} from "go-cqwebsocket/out/tags";
import {CQText} from "go-cqwebsocket/out/tags.js";
import {Plug} from "../Plug.js";
import {canCallGroup} from "../utils/Annotation.js";
import {Equatable, DataCache} from "../utils/repeat.js";

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
		const {group_id, user_id, raw_message} = event.context;
		const node = this.repeatCache.get(group_id, new RepeatCache(raw_message));
		if (node.addUser(user_id)) {
			return [];
		}
		if (node.times !== 4) {
			return [];
		}
		if (event.cqTags.some(tag => !(tag instanceof CQText))) {
			return [];
		}
		const find = event.cqTags.find((tag) => (tag instanceof CQText)) as CQText | undefined;
		if (find === undefined || /^[-+$*.]/.test(find.text)) {
			return [];
		}
		const msg = CQBotRepeat.Random(...event.cqTags.map<string>(tag => {
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

	private static Random(...arr: string[]): string[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = (Math.random() * i) | 0;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}
}

class RepeatCache extends Equatable {
	public msg: string;
	public user: Set<number>;

	constructor(msg: string) {
		super();
		this.msg = msg;
		this.user = new Set();
	}

	/**
	 * 添加 user
	 * @param user
	 * @return 是否添加成功,如果已经存在则返回 `false`
	 */
	public addUser(user: number): boolean {
		const b: boolean = this.user.has(user);
		b || this.user.add(user);
		return !b;
	}

	public equal(obj: any): boolean {
		if (obj instanceof RepeatCache) {
			return this.msg === obj.msg;
		}
		return false;
	}

	public get times(): number {
		return this.user.size;
	}
}

export default new CQBotRepeat();
