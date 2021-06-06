import {existsSync, openSync} from "fs";
import {Database, ISqlite, open as openSqlite} from "sqlite";
import {Database as Db3, Statement} from "sqlite3";

type DatabaseHandle<T = any> = (this: void, db: Database<Db3, Statement>) => Promise<T>;

export var db = new class SQLControl {
	private readonly config: ISqlite.Config;

	constructor(path = "./db.db") {
		if (!existsSync(path)) {
			openSync(path, "w");
		}
		this.config = {
			filename: path,
			driver: Db3,
		};
	}

	/**
	 * 记得关闭数据库
	 * @param fun 数据库回调函数
	 */
	public async start<T = any>(fun: DatabaseHandle<T>): Promise<T> {
		return openSqlite(this.config).then(fun);
	}
};
