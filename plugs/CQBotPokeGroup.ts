import {CQ, CQEvent, CQTag, CQWebSocket} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {CQImage, CQText} from "go-cqwebsocket/out/tags.js";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {hrtime} from "../utils/logger.js";
import {isAdminQQ, sendAdminQQ, sendGroup} from "../utils/Util.js";
import CQData from "./CQData.js";

class CQBotPokeGroup extends Plug {
	private header?: PartialSocketHandle;
	private pokedSet: Set<number>;
	private resetTime?: NodeJS.Timeout;

	constructor() {
		super(module);
		this.name = "QQ群聊-戳一戳";
		this.description = "QQ群聊的戳一戳事件";
		this.version = 0.1;

		this.header = undefined;
		this.pokedSet = new Set<number>();
	}

	async install() {
		this.header = (<CQWebSocket>require("./CQBot.js").default.bot).bind("on", {
			"notice.notify.poke.group": (event) => {
				let {target_id, user_id} = event.context;
				if (target_id !== event.bot.qq) {return;}
				if (this.pokedSet.has(user_id)) { return; }
				this.pokedSet.add(user_id);
				let member = CQData.getMember(user_id);
				if (member.exp < 5) { return; }
				member.exp -= 5;
				let time = process.hrtime();
				event.stopPropagation();
				let str = CQData.pokeGroup[Math.random() * CQData.pokeGroup.length | 0].text;
				sendGroup(event, str).catch(NOP).finally(() => {
					hrtime(time);
				});
			},
		});
		this.resetTime = this.resetTime ?? setInterval(() => {
			this.pokedSet.clear();
		}, 1000 * 60 * 60);
	}

	async uninstall() {
		require("./CQBot.js").default.bot.unbind(this.header);
		if (this.resetTime !== undefined) clearInterval(this.resetTime);
		this.resetTime = undefined;
		this.pokedSet.clear();
	}

	/**
	 * { control?: string, other?: string }
	 * @param event
	 * @param execArray
	 */
	@canCallPrivate()
	@canCallGroup()
	async runPrivate(event: CQEvent<"message.private"> | CQEvent<"message.group">,
		 execArray: RegExpExecArray): Promise<CQTag[]> {
		event.stopPropagation();
		let {control, other} = execArray.groups as { control?: string, other?: string } ?? {};
		if (control === undefined) return [];
		switch (control) {
			case "设置":
				event.bot.once("message.private", event => {
					if (!isAdminQQ(event)) {return; }
					let tags = event.cqTags.map(tag => {
						if (tag instanceof CQText) return tag;
						if (tag instanceof CQImage) return CQ.image(tag.url as string);
						return CQ.text(`未支持tag:` + tag.tagName);
					}).join("");
					CQData.addPoke(tags);
					sendAdminQQ(event, tags);
				});
				return [CQ.text("请发送")];
			case "删除":
				if (other === undefined) return [];
				let matches = other.match(/\d+\s+/g) ?? [];
				for (let match of matches) {
					CQData.removePoke(+match);
				}
				return [CQ.text("已删除:" + matches.join(","))];
			default:
				return [];
		}
	}
}

export default new CQBotPokeGroup();