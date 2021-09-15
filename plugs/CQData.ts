import {Plug} from "../Plug.js";
import {corpora} from "../config/corpus.json";
import {db} from "../utils/database.js";
import {logger} from "../utils/logger.js";

class CQData extends Plug {

	readonly memberMap: Map<number, Member>;
	corpora: Corpus[];
	pokeGroup: Poke[];

	private autoSaveTimeout: NodeJS.Timeout | undefined;
	private saving: boolean;

	constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.version = 0;
		this.corpora = [];
		this.pokeGroup = [];
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
			{
				let all = await db.all<{ id: number, exp: number, baned: 0 | 1, name: string }[]>(`SELECT id, exp, baned, name FROM Members`);
				all.forEach(value => {
					this.memberMap.set(value.id, {exp: value.exp, baned: value.baned, name: value.name});
				});
			}
			{
				this.pokeGroup = await db.all<Poke[]>(`SELECT id, text FROM pokeGroup`);
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

	addPoke(text: string): void {
		db.start(async db => {
			await db.run(`INSERT INTO pokeGroup(text) VALUES (?);`, text);
			let all: [{ id: number }] = await db.all<[{ id: number }]>(
					`SELECT LAST_INSERT_ROWID() AS id FROM pokeGroup LIMIT 1;`,
			);
			this.pokeGroup.push({id: all[0].id, text: text});
		}).catch(db.close);
	}

	removePoke(id: number): void {
		db.start(async db => {
			await db.run(`DELETE FROM pokeGroup WHERE id = ?;`, id);
			let number: number = this.pokeGroup.findIndex(v => v.id === id);
			this.pokeGroup.splice(number, 1);
		}).catch(db.close);
	}

	private async save(): Promise<void> {
		if (this.saving) {
			return;
		}
		this.saving = true;
		return db.start(async db => {
			logger.info("保存开始");
			for (let memberMap of this.memberMap) {
				let [id, {exp, baned}] = memberMap;
				await db.run("INSERT OR IGNORE INTO Members (id) VALUES (?);", id);
				await db.run("UPDATE Members SET exp=?,baned=?,time=? WHERE id=?;", exp, baned, Date.now(), id);
			}
			this.saving = false;
			logger.info("保存结束");
		}).catch(db.close);
	}

	private autoSave(): void {
		this.autoSaveTimeout = setTimeout(() => {
			if (!this.installed) {
				return;
			}
			this.save().catch(e => {
				logger.error(`自动保存出错:`);
				logger.error(e);
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
export type Poke = { id: number, text: string }
export type Member = { exp: number, baned: 0 | 1, name: string };
