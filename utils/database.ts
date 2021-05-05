import {existsSync, openSync} from "fs";
import {Database, ISqlite, open as openSqlite} from "sqlite";
import {Database as Database3, Statement} from "sqlite3";
import {logger} from "./logger";

type DatabaseHandle = (this: void, db: Database<Database3, Statement>) => Promise<void>;

export var db = new class SQLControl {
  private readonly config: ISqlite.Config;
  
  constructor(path = "./db.db") {
    if (!existsSync(path)) {
      openSync(path, "w");
    }
    this.config = {
      filename: path,
      driver: Database3,
    };
  }
  
  public async start(fun: DatabaseHandle = async () => {}): Promise<void> {
    let db = await openSqlite(this.config);
    try {
      await fun(db);
    } catch (e) {
      logger.info("执行失败");
    }
    try {
      await db.close();
    } catch (e) {
      logger.error("数据库关闭失败", e);
    }
  }
};