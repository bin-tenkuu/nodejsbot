import {existsSync, openSync} from "fs";
import {Database, ISqlite, open as openSqlite, Statement} from "sqlite";
import {Database as Db3, Statement as Sm3} from "sqlite3";
import {logger} from "./logger.js";

type DatabaseHandle<T = any> = (this: void, db: Database<Db3, Sm3>) => T | Promise<T>;
type StatementHandle = (this: void, stmt: Statement<Sm3>) => Promise<void>;

class SQLControl {
	private readonly config: ISqlite.Config;
	private db: Database<Db3, Sm3> | undefined;
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
	}

	/**
	 * 不要关闭数据库
	 * @param fun 数据库回调函数
	 */
	public start<T = unknown>(fun: DatabaseHandle<T>): Promise<T> {
		return this.open().then(fun);
	}

	/**
	 * @param sql 预编译 SQL 语句
	 * @param fun SQL 回调函数
	 */
	public prepare(sql: ISqlite.SqlType, fun: StatementHandle): Promise<void> {
		return this.open().then(async db => {
			let statement: Statement<Sm3> | undefined;
			try {
				statement = await db.prepare(sql);
				await fun(statement);
			} catch (e) {
				logger.error(e);
			} finally {
				if (statement !== undefined) {
					try {
						await statement.finalize();
					} catch (e) {
						logger.error(e);
					}
				}
			}
		}).catch(this.close);
	}

	private open(): Promise<Database<Db3, Sm3>> {
		if (this.db !== undefined) {
			this.resetBreakTime();
			return Promise.resolve(this.db);
		}
		return openSqlite(this.config).then(db => {
			this.db = db;
			db.db.on("close", () => {
				logger.debug("DB Close");
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
				logger.error(e);
			}
			const db = this.db;
			this.db = undefined;
			if (db === undefined) {
				return;
			}
			this.clearBreakTime();
			return db.close().catch(e => logger.error(e));
		};
	}
}

export const db = new SQLControl();
