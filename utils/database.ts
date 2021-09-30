import BDb3, {Database} from "better-sqlite3";
import {existsSync, openSync} from "fs";
import {Logable} from "./logger.js";

class SQLControl extends Logable {
	private readonly filename: string;
	private _db: Database;

	constructor(filename = "./db.db") {
		super();
		this.filename = filename;
		if (!existsSync(filename)) {
			openSync(filename, "w");
		}
		this._db = new BDb3(filename);
		process.on("beforeExit", _ => {
			this.close();
		});
	}

	public sync<T>(func: (db: Database) => T): T {
		return func(this.db);
	}

	/**关闭数据库*/
	public get close(): (e?: any) => void {
		return (e?: any) => {
			e != null && this.logger.error(e);
			if (this._db.open) {
				this._db.close();
			}
		};
	}

	private get db(): Database {
		if (!this._db.open) {
			this._db = new BDb3(this.filename);
		}
		return this._db;
	}
}

export const db = new SQLControl();
