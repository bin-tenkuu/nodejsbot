import {Plug} from "../Plug.js";
import {corpora} from "../config/corpus.json";
import {db} from "../utils/database.js";

class CQData extends Plug {

	readonly memberMap: Map<number, Member>;
	corpora: Corpus[];

	private autoSaveTimeout: NodeJS.Timeout | undefined;
	private saving: boolean;

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.version = 0;
		this.corpora = [];
		this.memberMap = new Map();
		this.autoSaveTimeout = undefined;
		this.saving = false;
	}

	async install() {
		this.corpora = corpora.map(msg => ({
			name: msg.name ?? "",
			regexp: new RegExp(msg.regexp ?? "$^"),
			reply: msg.reply ?? "",
			forward: msg.forward === true,
			needAdmin: msg.needAdmin === true,
			isOpen: msg.isOpen !== false,
			delMSG: msg.delMSG ?? 0,
			canGroup: msg.canGroup !== false,
			canPrivate: msg.canPrivate !== false,
			help: msg.help,
		}));
		await db.start(async db => {
			//memberMap
			{
				let all = await db.all<{ id: number, exp: number, baned: 0 | 1, name: string }[]>(`SELECT id, exp, baned, name FROM Members`);
				all.forEach(value => {
					this.memberMap.set(value.id, {exp: value.exp, baned: value.baned, name: value.name});
				});
			}
		}).catch(db.close);
		this.autoSave();
	}

	async uninstall() {
		if (this.autoSaveTimeout !== undefined) {
			clearTimeout(this.autoSaveTimeout);
		}
		return this.save();
	}

	getMember(id: number): Member {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = {baned: 0, exp: 0, name: ""};
			this.memberMap.set(id, member);
		}
		return member;
	}

	getBaned(id: number): boolean {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = {baned: 0, exp: 0, name: ""};
			this.memberMap.set(id, member);
		}
		return member.baned === 1;
	}

	private async save(): Promise<void> {
		if (this.saving) {
			return;
		}
		this.saving = true;
		return db.start(async db => {
			this.logger.info("保存开始");
			for (let memberMap of this.memberMap) {
				let [id, {exp, baned}] = memberMap;
				await db.run("INSERT OR IGNORE INTO Members (id) VALUES (?);", id);
				await db.run("UPDATE Members SET exp=?,baned=?,time=? WHERE id=?;", exp, baned, Date.now(), id);
			}
			this.saving = false;
			this.logger.info("保存结束");
		}).catch(db.close);
	}

	private autoSave(): void {
		this.autoSaveTimeout = setTimeout(() => {
			if (!this.installed) {
				return;
			}
			this.save().catch(e => {
				this.logger.error(`自动保存出错:`);
				this.logger.error(e);
			}).finally(() => {
				this.autoSave();
			});
		}, 1000 * 60 * 60);
	}
}

export default new CQData();

export type Corpus = {
	name: string, regexp: RegExp, reply: string,
	forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number,
	canGroup: boolean, canPrivate: boolean, help: string | undefined
};
export type Member = { exp: number, baned: 0 | 1, name: string };
