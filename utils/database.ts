import {existsSync, openSync} from "fs";
import {Database, ISqlite, open as openSqlite} from "sqlite";
import {Database as Db3, Statement} from "sqlite3";
import {logger} from "./logger.js";

type DatabaseHandle<T = any> = (this: void, db: Database<Db3, Statement>) => T | Promise<T>;

class SQLControl {
	private readonly config: ISqlite.Config;
	private db: Database<Db3, Statement> | undefined;
	private breakTime: NodeJS.Timeout | undefined;

	constructor(path = "./db.db") {
		if (!existsSync(path)) {
			openSync(path, "w");
		}
		this.config = {
			filename: path,
			driver: Db3,
		};
		this.breakTime = undefined;
		this.db = undefined;
		this.open().catch(e => {
			logger.error(e);
		});
	}

	/**
	 * 记得关闭数据库
	 * @param fun 数据库回调函数
	 */
	public async start<T = any>(fun: DatabaseHandle<T>): Promise<T> {
		if (this.db !== undefined) {
			this.resetBreakTime();
			return Promise.resolve(this.db).then(fun);
		}
		return this.open().then(fun);
	}

	private open(): Promise<Database<Db3, Statement>> {
		return openSqlite(this.config).then(db => {
			this.db = db;
			db.db.on("close", () => {
				logger.info("DB Close");
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

	private setBreakTime(time: number = 1000 * 60 * 5) {
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
	public get close(): () => void {
		return () => {
			let db = this.db;
			this.db = undefined;
			if (db === undefined) {
				return;
			}
			this.clearBreakTime();
			db.close().catch(e => logger.error(e));
		};
	}
}

export const db = new SQLControl();