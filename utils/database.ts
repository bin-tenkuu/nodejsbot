import {existsSync, openSync} from "fs";
import {Logger} from "log4js";
import {Database} from "sqlite";
import {Database as Db3} from "sqlite3";
import {Logable} from "./logger.js";

type DatabaseHandle = (this: void, db: SQLite) => Promise<void>;

class SQLControl extends Logable {
	private readonly db: SQLite;
	private breakTime: NodeJS.Timeout | undefined;

	constructor(filename = "./db.db") {
		super();
		if (!existsSync(filename)) {
			openSync(filename, "w");
		}
		this.breakTime = undefined;
		this.db = new SQLite(filename, this);
		process.on("beforeExit", _ => {
			this.close().catch(NOP);
		});
	}

	/**
	 * 不要关闭数据库
	 * @param fun 数据库回调函数
	 */
	public start(fun: DatabaseHandle): void | Promise<void> {
		return this.open().then(fun).catch(this.close);
	}

	private open(): Promise<SQLite> {
		return this.isOpen ? Promise.resolve(this.db) : this.db.open().then(() => {
			return this.db;
		});
	}

	/**
	 * 关闭数据库
	 * @private
	 */
	public get close(): (e?: any) => Promise<void> {
		return (e?: any) => {
			this.logger.error(e);
			return this.isClose ? Promise.resolve() : this.db.close().catch(NOP);
		};
	}

	public get isOpen(): boolean {
		return this.db.isOpen;
	}

	public get isClose(): boolean {
		return this.db.isClose;
	}
}

class SQLite extends Database implements Logable {
	private readonly _logger: Logger;

	public get logger(): Logger {
		return this._logger;
	}

	constructor(filename: string, logger: Logable) {
		super({
			filename: filename,
			driver: Db3,
		});
		this._logger = logger.logger;
	}

	public open(): Promise<void> {
		return super.open().then(() => {
			this.db.on("close", () => {
				this._isClose = true;
				this.logger.debug("DB Close");
			}).on("error", err => {
				this._isClose = true;
				this.logger.error(err);
			});
		});
	}

	public _isClose: boolean = false;

	public get isClose(): boolean {
		return this.db === null || !this._isClose;
	}

	public get isOpen(): boolean {
		return !this.isClose;
	}
}

export const db = new SQLControl();
