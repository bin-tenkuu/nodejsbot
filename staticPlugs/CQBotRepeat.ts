import {CQ, CQTag} from "go-cqwebsocket";
import {CQImage} from "go-cqwebsocket/out/tags";
import {CQText} from "go-cqwebsocket/out/tags.js";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Corpus.js";
import {CacheMap} from "@U/repeat.js";
import {isAtMe} from "@U/Util.js";
import {GroupCorpusData} from "@U/Corpus.js";

export class CQBotRepeat extends Plug {
	private static Random(...arr: string[]): string[] {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = (Math.random() * i) | 0;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	private repeatCache = new CacheMap<number, RepeatCache>(undefined,
			(l, r) => l.msg === r.msg,
	);

	constructor() {
		super(module);
		this.name = "QQ群聊-复读";
		this.description = "测试用";
	}

	@canCall({
		name: "(复读)",
		regexp: /^/,
		canPrivate: false,
		maxLength: 50,
		weight: 90,
	})
	protected getRepeat({event}: GroupCorpusData): string | void {
		const {group_id, user_id, raw_message} = event.context;
		const node = this.repeatCache.get(group_id, new RepeatCache(raw_message));
		if (node.addUser(user_id) || node.times !== 4) {
			return;
		}
		const find = event.cqTags.find((tag) => tag.tagName === "text") as CQText | undefined;
		if (find == null || /^[-+$*.]/.test(find.text)) {
			return;
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
			return msg;
		}
		return CQBotRepeat.Random(...msg).join("");
	}

	@canCall({
		name: "(@复读AI)",
		regexp: /^/,
		canPrivate: false,
		maxLength: 50,
		weight: 91,
	})
	protected MemeAI({event, execArray}: GroupCorpusData): CQTag[] {
		if (!isAtMe(event)) {
			return [];
		}
		event.stopPropagation();
		const {message_id, user_id} = event.context;
		const cqTags = execArray.input.replace(/吗/g, "")
				.replace(/(?<!\\)不/g, "\\很")
				.replace(/(?<!\\)你/g, "\\我")
				.replace(/(?<!\\)我/g, "\\你")
				.replace(/(?<![没\\])有/g, "\\没有")
				.replace(/(?<!\\)没有/g, "\\有")
				.replace(/[？?]/g, "!")
				.replace(/\\/g, "");
		return [
			CQ.reply(message_id),
			CQ.at(user_id),
			CQ.text(cqTags),
		];
	}
}

class RepeatCache {
	public msg: string;
	public user: Set<number>;

	constructor(msg: string) {
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

	public get times(): number {
		return this.user.size;
	}
}
