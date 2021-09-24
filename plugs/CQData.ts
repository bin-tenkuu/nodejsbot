import {corpora} from "../config/corpus.json";
import {Plug} from "../Plug.js";
import {db} from "../utils/database.js";

class CQData extends Plug {

	public readonly memberMap: Map<number, Member>;
	corpora: Corpus[];

	private autoSaveTimeout: NodeJS.Timeout | undefined;
	private saving: boolean;

	public constructor() {
		super(module);
		this.name = "QQ机器人";
		this.description = "用于连接go-cqhttp服务的bot";
		this.version = 0;
		this.corpora = [];
		this.memberMap = new Map();
		this.autoSaveTimeout = undefined;
		this.saving = false;
	}

	public async install() {
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
			maxLength: msg.maxLength ?? 0,
		}));
		// this.memberMap
		db.start(async db => {
			const all = await db.all<{ id: number, exp: number, baned: 0 | 1, name: string }[]>(
					`SELECT id, exp, baned, name FROM Members`);
			for (const {id, ...member} of all) {
				this.memberMap.set(id, member);
			}
			this.autoSave();
		});
	}

	public async uninstall() {
		if (this.autoSaveTimeout !== undefined) {
			clearTimeout(this.autoSaveTimeout);
		}
		return this.save();
	}

	public getMember(id: number): Member {
		let member: Member | undefined = this.memberMap.get(id);
		if (member === undefined) {
			member = {baned: 0, exp: 0, name: ""};
			this.memberMap.set(id, member);
		}
		return member;
	}

	public getBaned(id: number): boolean {
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
		db.start(async db => {
			this.saving = true;
			this.logger.info("保存开始");
			// this.memberMap
			{
				const sql = `INSERT INTO Members(id, name, exp, time, baned)
        VALUES ($id, $name, $exp, $time, $baned)
        ON CONFLICT(id) DO UPDATE SET name=$id, exp=$exp, time=$time, baned=$baned;`;
				const stmt = await db.prepare(sql);
				for (const memberMap of this.memberMap) {
					const [id, {exp, baned}] = memberMap;
					await stmt.run({$id: id, $exp: exp, $time: Date.now(), $baned: baned});
				}
				await stmt.finalize();
			}
			this.logger.info("保存结束");
			this.saving = false;
		});
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
	name: string, regexp: RegExp, reply: string, forward: boolean,
	needAdmin: boolean, isOpen: boolean, delMSG: number, canGroup: boolean,
	canPrivate: boolean, help: string | undefined, maxLength: number
};
export type Member = { exp: number, baned: 0 | 1, name: string };
