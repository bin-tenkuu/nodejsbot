import {CQ} from "go-cqwebsocket";
import {corpora} from "../config/corpus.json";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {db} from "../utils/database.js";
import {CQMessage} from "../utils/Util.js";

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
			minLength: msg.minLength ?? 0,
			maxLength: msg.maxLength ?? 100,
		}));
		db.start(async db => {
			let sql: string;
			// this.memberMap
			{
				sql = "SELECT id, name, exp, gmt_modified, is_baned FROM Members LIMIT $size*$page,$size;";
				const sqlData = {$size: 100, $page: 0};
				const stmt = await db.prepare(sql, sqlData);
				let result: IMember[];
				do {
					this.logger.debug(`select Members size:${sqlData.$page * sqlData.$size}`);
					result = await stmt.all<IMember[]>(sqlData);
					++sqlData.$page;
					for (const iMember of result) {
						this.memberMap.set(iMember.id, new Member(iMember));
					}
				} while (result.length === sqlData.$size);
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
			member = new Member(id);
			this.memberMap.set(id, member);
		}
		return member;
	}

	public getMembers(): IterableIterator<Member> {
		return this.memberMap.values();
	}

	public setBaned(id: number, is_baned: 0 | 1 | boolean): void {
		this.getMember(id).is_baned = is_baned ? 1 : 0;
	}

	@canCallGroup()
	@canCallPrivate()
	protected async getState(event: CQMessage) {
		const qq: number = event.context.user_id;
		const {exp, is_baned}: Member = this.getMember(qq);
		return [CQ.at(qq), CQ.text(`ban?:${"否是"[is_baned]} 活跃:${exp}`)];
	}

	private async save(): Promise<void> {
		if (this.saving) {
			return;
		}
		this.saving = true;
		db.start(async db => {
			// this.memberMap
			{
				this.logger.info("保存开始(Members)");
				let n = 0;
				const sql = `INSERT INTO Members(id, name, exp, gmt_modified, is_baned, gmt_create)
        VALUES ($id, $name, $exp, $time, $baned, $time)
        ON CONFLICT(id) DO UPDATE SET name=$name, exp=$exp, gmt_modified=$time, is_baned=$baned;`;
				const stmt = await db.prepare(sql);
				for (const member of this.memberMap.values()) {
					if (!member.is_modified) {
						continue;
					}
					const {id, exp, is_baned, name, gmt_modified} = member;
					await stmt.run({$id: id, $exp: exp, $time: gmt_modified, $baned: is_baned, $name: name});
					member.is_modified = false;
					++n;
				}
				await stmt.finalize();
				this.logger.info("保存结束(Members):" + n);
			}
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
	canPrivate: boolean, help: string | undefined, minLength: number, maxLength: number
};

type IMember = { readonly id: number, name: string, exp: number, gmt_modified: number, is_baned: 0 | 1, };

export class Member implements IMember {
	public is_modified: boolean = false;
	private readonly _id: number;

	constructor(obj: IMember | number) {
		if (typeof obj === "number") {
			this._id = obj;
			return;
		} else {
			this._id = obj.id;
			this._name = obj.name;
			this._exp = obj.exp;
			this._is_baned = obj?.is_baned;
			this._gmt_modified = obj.gmt_modified;
		}
	}

	public addExp(exp: number): boolean {
		exp += this._exp;
		if (exp < 0) {
			return false;
		} else {
			this.exp = exp;
			return true;
		}
	}

	private modified() {
		this._gmt_modified = Date.now();
		this.is_modified = true;
	}

	private _is_baned: 0 | 1 = 0;

	private _gmt_modified: number = 0;

	private _name: string = "";

	private _exp: number = 0;

	public get exp() {
		return this._exp;
	}

	public set exp(v) {
		this._exp = v;
		this.modified();
	}

	public get gmt_modified(): number {
		return this._gmt_modified;
	}

	public get id(): number {
		return this._id;
	}

	public get is_baned(): 0 | 1 {
		return this._is_baned;
	}

	public set is_baned(value: 0 | 1) {
		this._is_baned = value;
		this.modified();
	}

	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
		this.modified();
	}

	public get baned(): boolean {
		return this._is_baned !== 0;
	}
}
