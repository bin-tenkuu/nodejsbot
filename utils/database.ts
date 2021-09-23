import {existsSync, openSync} from "fs";
import {Database, ISqlite, open as openSqlite} from "sqlite";
import {Database as Db3} from "sqlite3";
import {Logable} from "./logger.js";

type DatabaseHandle<T = any> = (this: void, db: Database) => T | Promise<T>;

class SQLControl extends Logable {
	private readonly config: ISqlite.Config;
	private db: Database | undefined;
	private breakTime: NodeJS.Timeout | undefined;

	constructor(path = "./db.db") {
		super();
		if (!existsSync(path)) {
			openSync(path, "w");
		}
		this.config = {
			filename: path,
			driver: Db3,
		};
		this.breakTime = undefined;
		this.db = undefined;
	}

	/**
	 * 不要关闭数据库
	 * @param fun 数据库回调函数
	 */
	public start<T = unknown>(fun: DatabaseHandle<T>): Promise<T> {
		return this.open().then(fun);
	}

	private open(): Promise<Database> {
		if (this.db !== undefined) {
			this.resetBreakTime();
			return Promise.resolve(this.db);
		}
		return openSqlite(this.config).then(db => {
			this.db = db;
			db.db.on("close", () => {
				this.logger.debug("DB Close");
				this.db = undefined;
			});
			this.setBreakTime();
			return db;
		});
	}

	private clearBreakTime(): void {
		this.breakTime !== undefined && clearTimeout(this.breakTime);
		this.breakTime = undefined;
	}

	private setBreakTime(time: number = 1000 * 60 * 10) {
		this.breakTime = setTimeout(this.close, time);
	}

	private resetBreakTime() {
		this.clearBreakTime();
		this.setBreakTime();
	}

	/**
	 * 关闭数据库
	 * @private
	 */
	public get close(): (e?: any) => Promise<void> {
		return async (e?: any) => {
			if (e !== undefined) {
				this.logger.error(e);
			}
			const db = this.db;
			this.db = undefined;
			if (db === undefined) {
				return;
			}
			this.clearBreakTime();
			return db.close().catch(e => this.logger.error(e));
		};
	}
}

export const db = new SQLControl();
