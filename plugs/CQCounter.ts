import {CQEvent} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {CQMessage} from "../utils/Util.js";

export class Counter extends Plug {
	private group = new Map<number, Map<number, number>>();
	private member = new Map<number, number>();

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
	}

	public record(event: CQEvent<"message.private">): void;
	public record(event: CQEvent<"message.group">): void;
	public record(event: CQMessage): void {
		if (event.contextType === "message.group") {
			const {group_id, user_id} = event.context;
			this.addGroup(group_id, user_id);
		} else {
			const {user_id} = event.context;
			this.addMember(user_id);
		}
	}

	private addGroup(g: number, u: number) {
		let uM: Map<number, number> | undefined = this.group.get(g);
		if (uM == null) {
			uM = new Map<number, number>();
			this.group.set(g, uM);
		}
		const exp: number = uM.get(u) ?? 0;
		uM.set(u, exp + 1);
	}

	private addMember(u: number) {
		const exp: number = this.member.get(u) ?? 0;
		this.member.set(u, exp + 1);
	}
}
