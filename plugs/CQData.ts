import {setTimeout} from "timers/promises";
import {corpora} from "../config/corpus.json";
import {Plug} from "../Plug.js";
import {db} from "../utils/database.js";
import {Corpus, Group, IGroup, IMember, Member} from "../utils/Models.js";

class CQData extends Plug {
	public corpora: Corpus[] = [];
	private readonly memberMap = new Map<number, Member>();
	private readonly groupMap = new Map<number, Group>();
	private autoSaving: boolean = false;
	private saving: boolean = false;

	public constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
	}

	public async install() {
		this.corpora = corpora.map(msg => new Corpus(msg));
		this.autoSave();
	}

	public async uninstall() {
		return this.save();
	}

	public getMember(id: number): Member {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = CQData.loadMember(id);
			this.memberMap.set(id, member);
		}
		return member;
	}

	public getGroup(id: number): Group {
		let group: Group | undefined = this.groupMap.get(id);
		if (group === undefined) {
			group = CQData.loadGroup(id);
			this.groupMap.set(id, group);
		}
		return group;
	}

	public getMembers(): IterableIterator<Member> {
		return this.memberMap.values();
	}

	public setBaned(id: number, is_baned: 0 | 1 | boolean): void {
		this.getMember(id).is_baned = is_baned ? 1 : 0;
	}

	public setGroupBaned(id: number, is_baned: 0 | 1 | boolean): void {
		this.getGroup(id).is_baned = is_baned ? 1 : 0;
	}

	private static loadMember(id: number): Member {
		return db.sync<Member>(db => {
			const im: IMember | undefined = db.prepare(
					`SELECT id, name, exp, gmt_modified, is_baned FROM Members WHERE id = ?`).get(id);
			if (im !== undefined) {
				return new Member(im);
			}
			const member = new Member(id);
			member.modified();
			db.prepare<IMember>(`INSERT INTO Members(id, name, exp, gmt_modified, is_baned, gmt_create)
      VALUES ($id, $name, $exp, $gmt_modified, $is_baned, $gmt_modified)`).run(member.toJSON());
			return member;
		});
	}

	private static loadGroup(id: number): Group {
		return db.sync<Group>(db => {
			const im: IGroup | undefined = db.prepare(
					`SELECT id, exp, gmt_modified, is_baned FROM tb_group WHERE id = ?`).get(id);
			if (im !== undefined) {
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
			this.logger.info("保存开始(Members)");
			let change = 0, noChange = 0;
			const stmt = db.prepare<IMember>(`UPDATE Members
      SET name = $name, exp = $exp, gmt_modified = $gmt_modified, is_baned = $is_baned
      WHERE id = $id;`);
			for (const member of map.values()) {
				if (member.is_modified) {
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
			this.logger.info("保存开始(Group)");
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
		setTimeout(1000 * 60 * 60 * 6).then(() => {
			return this.save();
		}).finally(() => {
			this.autoSaving = false;
		}).catch(e => {
			this.logger.error(`自动保存出错:`);
			this.logger.error(e);
		}).finally(() => {
			this.autoSave();
		});
	}
}

export default new CQData();
