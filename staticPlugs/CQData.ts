import {CQ, CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {canCall} from "@U/Annotation.js";
import {db} from "@U/database.js";
import {Group, IGroup, IMember, Member} from "@U/Models.js";
import {CacheMap} from "@U/repeat.js";
import {CQMessage} from "@U/Util.js";

export class CQData extends Plug {
	private static loadMember(id: number): Member {
		return db.sync<Member>(db => {
			const im: IMember | undefined = db.prepare<[number]>(
					`SELECT id, name, exp, gmt_modified, is_baned FROM Members WHERE id = ?`).get(id);
			if (im != null) {
				return new Member(im);
			}
			const member = new Member(id);
			member.modified();
			db.prepare<IMember>(`INSERT INTO Members(id, name, exp, gmt_modified, is_baned, gmt_create)
            VALUES ($id, $name, $exp, $gmt_modified, $is_baned, $gmt_modified)`)
			.run(member.toJSON());
			return member;
		});
	}

	private static loadGroup(id: number): Group {
		return db.sync<Group>(db => {
			const im: IGroup | undefined = db.prepare(
					`SELECT id, exp, gmt_modified, is_baned FROM tb_group WHERE id = ?`).get(id);
			if (im != null) {
				return new Group(im);
			}
			const member = new Group(id);
			member.modified();
			db.prepare<IGroup>(`INSERT INTO tb_group(id, exp, gmt_modified, is_baned, gmt_create)
            VALUES ($id, $exp, $gmt_modified, $is_baned, $gmt_modified)`).run(member.toJSON());
			return member;
		});
	}

	private static saveMember(map: Map<number, Member>): void {
		db.sync(db => {
			this.logger.info(`保存开始(Members):${map.size}`);
			let change = 0, noChange = 0;
			const stmt = db.prepare<IMember>(`UPDATE Members
            SET name = $name, exp = $exp, gmt_modified = $gmt_modified, is_baned = $is_baned
            WHERE id = $id;`);
			for (const member of map.values()) {
				if (member.is_modified || member.baned) {
					stmt.run(member.toJSON());
					member.is_modified = false;
					++change;
				} else {
					map.delete(member.id);
					++noChange;
				}
			}
			this.logger.info(`保存结束(Members):${change},释放内存:${noChange},剩余数量:${map.size}`);
		});
	}

	private static saveGroup(map: Map<number, Group>) {
		db.sync(db => {
			this.logger.info(`保存开始(Group):${map.size}`);
			let change = 0;
			const stmt = db.prepare<IGroup>(`UPDATE tb_group
            SET exp = $exp, gmt_modified = $gmt_modified, is_baned = $is_baned
            WHERE id = $id;`);
			for (const member of map.values()) {
				if (!member.is_modified) {
					return;
				}
				stmt.run(member.toJSON());
				member.is_modified = false;
				++change;
			}
			this.logger.info(`保存结束(Group):${change},总数:${map.size}`);
		});
	}

	private readonly memberMap = new Map<number, Member>();
	private readonly groupMap = new Map<number, Group>();
	private readonly cache = new CacheMap<number, boolean>();
	private autoSaving: boolean = false;
	private saving: boolean = false;

	public constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
	}

	public async install() {
		this.autoSave();
		this.#init();
	}

	public async uninstall() {
		return this.save();
	}

	public getMember(id: number): Member {
		let member: Member | undefined = this.memberMap.get(id);
		if (member == null) {
			member = CQData.loadMember(id);
			this.memberMap.set(id, member);
		}
		return member;
	}

	public getGroup(id: number): Group {
		let group: Group | undefined = this.groupMap.get(id);
		if (group == null) {
			group = CQData.loadGroup(id);
			this.groupMap.set(id, group);
		}
		return group;
	}

	public getMembers(): IterableIterator<Member> {
		return this.memberMap.values();
	}

	public getGroups(): IterableIterator<Group> {
		return this.groupMap.values();
	}

	public setBaned(id: number, is_baned: 0 | 1 | boolean): void {
		this.getMember(id).is_baned = is_baned ? 1 : 0;
	}

	public setGroupBaned(id: number, is_baned: 0 | 1 | boolean): void {
		this.getGroup(id).is_baned = is_baned ? 1 : 0;
	}

	@canCall({
		name: ".state[<qq>]",
		regexp: /^[.．。]state(?<qq> ?\d{5,12})?$/i,
		help: "查看自己/<qq>的信息",
		weight: 6,
	})
	protected getState(event: CQMessage, execArray: RegExpExecArray): CQTag[] {
		const qq: number = event.context.user_id;
		if (event.contextType === "message.group") {
			if (this.cache.has(qq)) {
				return [];
			}
			this.cache.set(qq, true);
		}
		event.stopPropagation();
		const exp = this.getMember(+(execArray.groups?.qq ?? qq)).exp;
		return [CQ.at(qq), CQ.text(`${exp}`)];
	}

	@canCall({
		name: "(活跃增长)",
		regexp: /^/,
		canPrivate: false,
		maxLength: Infinity,
		minLength: 0,
		weight: Infinity,
	})
	protected addEXP(event: CQEvent<"message.group">): CQTag[] {
		event.stopPropagation();
		this.getMember(event.context.user_id).addExp(1);
		return [];
	}

	#init(): void {
		db.sync(db => {
			const menberBan: IMember[] = db.prepare<[]>(`SELECT id, name, exp, gmt_modified, is_baned
            FROM Members
            WHERE is_baned = 1`).all();
			for (const v of menberBan) {
				this.memberMap.set(v.id, new Member(v));
			}
			const groupBan: IGroup[] = db.prepare<[]>(`SELECT id, exp, gmt_modified, is_baned
            FROM tb_group
            WHERE is_baned = 1`).all();
			for (const v of groupBan) {
				this.groupMap.set(v.id, new Group(v));
			}
		});
	}

	private async save(): Promise<void> {
		if (this.saving) {
			return;
		}
		this.saving = true;

		CQData.saveMember(this.memberMap);
		CQData.saveGroup(this.groupMap);

		this.saving = false;
	}

	private autoSave(): void {
		if (this.autoSaving) {
			return;
		}
		this.autoSaving = true;
		setTimeout(() => {
			this.save().finally(() => {
				this.autoSaving = false;
			}).catch((e) => {
				this.logger.error(`自动保存出错:`);
				this.logger.error(e);
			}).finally(() => {
				this.autoSave();
			});
		}, 1000 * 60 * 60 * 6);
	}
}