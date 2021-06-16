import {corpora} from "../config/corpus.json";
import {Plug} from "../Plug.js";
import {db} from "../utils/database.js";
import {logger} from "../utils/logger.js";

class CQData extends Plug {

	readonly memberMap: Map<number, Member>;
	corpora: Corpus[];
	pokeGroup: Poke[];

	private autoSaveTimeout?: NodeJS.Timeout;
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
		}));
		await db.start(async db => {
			{
				let all = await db.all<{ id: number, exp: number, baned: 0 | 1 }[]>(`select id,exp,baned from Members`);
				all.forEach(value => {
					this.memberMap.set(value.id, {exp: value.exp, baned: value.baned});
				});
			}
			{
				this.pokeGroup = await db.all<Poke[]>(`select id,text from pokeGroup`);
			}

			await db.close();
		});
		this.autoSave();
	}

	async uninstall() {
		return this.save(size => {
			if ((size & 0b111111) === 0b111111) {
				logger.info(`还剩${size}个member`);
			}
		});
	}

	getMember(id: number): Member {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = {baned: 0, exp: 0};
			this.memberMap.set(id, member);
		}
		return member;
	}

	getBaned(id: number): boolean {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = {baned: 0, exp: 0};
			this.memberMap.set(id, member);
		}
		return member.baned === 1;
	}

	addPoke(text: string): void {
		db.start(async db => {
			await db.run(`insert into pokeGroup(text) values(?);`, text);
			let all: [{ id: number }] = await db.all<[{ id: number }]>(
				 `select last_insert_rowid() as id from pokeGroup limit 1;`,
			);
			this.pokeGroup.push({id: all[0].id, text: text});
			await db.close();
		}).catch(NOP);
	}

	removePoke(id: number): void {
		db.start(async db => {
			await db.run(`delete from pokeGroup where id=?;`, id);
			let number: number = this.pokeGroup.findIndex(v => v.id === id);
			this.pokeGroup.splice(number, 1);
			await db.close();
		}).catch(NOP);
	}

	private async save(callback?: (this: void, size: number) => void): Promise<void> {
		if (this.saving) return;
		this.saving = true;
		return db.start(async db => {
			let size: number = this.memberMap.size;
			for (let memberMap of this.memberMap) {
				let [id, {exp, baned}] = memberMap;
				await db.run("insert or ignore into Members (id) values (?);", id);
				await db.run("update Members set exp=?,baned=?,time=? where id=?;", exp, baned, Date.now(), id);
				callback?.(--size);
			}
			this.saving = false;
			await db.close();
		});
	}

	private autoSave(): void {
		this.autoSaveTimeout = setTimeout(() => {
			if (!this.installed) { return; }
			this.save().then(() => {
				logger.info("自动保存结束");
				this.autoSave();
			}).catch(() => {
				logger.error(`自动保存出错`);
			});
		}, 1000 * 60 * 60);
	}
}

export default new CQData();

export type Corpus = {
	name: string, regexp: RegExp, reply: string,
	forward: boolean, needAdmin: boolean, isOpen: boolean, delMSG: number,
	canGroup: boolean, canPrivate: boolean
};
export type Poke = { id: number, text: string }
export type Member = { exp: number, baned: 0 | 1 };
