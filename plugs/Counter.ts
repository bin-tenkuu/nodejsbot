import {CQ} from "go-cqwebsocket";
import {CQText} from "go-cqwebsocket/out/tags";
import {Plug} from "../Plug.js";
import {canCall} from "../utils/Annotation.js";
import {CQMessage} from "../utils/Util.js";

export class Counter extends Plug {
	private static* map(map: Map<number, number>): Generator<string, void, void> {
		for (const [g, n] of map.entries()) {
			yield ` ${g}：${n}次`;
		}
	}

	private group = new Map<number, number>();
	private member = new Map<number, number>();

	constructor() {
		super(module);
		this.name = "日志记录器";
		this.description = "数据收集专用";
	}

	public record(event: CQMessage): void {
		if (event.contextType === "message.group") {
			const {group_id, user_id} = event.context;
			this.addGroup(group_id, user_id);
		} else {
			const {user_id} = event.context;
			this.addMember(user_id);
		}
	}

	@canCall({
		name: "日志",
		regexp: /[.．。]日志/,
		needAdmin: true,
		weight: 10,
	})
	protected logText(): CQText[] {
		let str = "";
		if (this.group.size > 0) {
			str += "群：\n" + [...Counter.map(this.group)].join("\n");
		}
		if (this.member.size > 0) {
			str += "\n人：\n" + [...Counter.map(this.member)].join("\n");
		}
		return [CQ.text(str)];
	}

	private addGroup(g: number, u: number): void {
		const exp: number = this.group.get(g) ?? 0;
		this.group.set(g, exp + 1);
		this.addMember(u);
	}

	private addMember(u: number): void {
		const exp: number = this.member.get(u) ?? 0;
		this.member.set(u, exp + 1);
	}
}
