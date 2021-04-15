import {existsSync, openSync} from "fs";
import {Database, open as openSqlite} from "sqlite";
import {Database as Database3, Statement} from "sqlite3";
import {logger} from "./logger";

export var db = new class SQLControl {
  private readonly lists: ((db: Database<Database3, Statement>) => Promise<void>)[];
  private readonly path: string;
  private running: boolean;
  
  constructor(path = "./db/db.db") {
    this.lists = [];
    this.running = false;
    if (!existsSync(path)) {
      openSync(path, "w");
    }
    this.path = path;
  }
  
  public start(fun: (db: Database<Database3, Statement>) => Promise<void>): void {
    this.lists.push(fun);
    if (this.running) {
      return;
    }
    this.running = true;
    openSqlite({
      filename: this.path,
      driver: Database3,
    }).then(async (db) => {
      while (this.lists.length > 0) {
        let shift = this.lists.shift();
        if (shift === undefined) continue;
        try {
          await shift(db);
        } catch (e) {
          console.log("执行失败");
        }
      }
      this.running = false;
      try {
        await db.close();
      } catch (e) {
        console.error("数据库关闭失败", e);
      }
    }).catch((e) => {
      this.running = false;
      logger.error("数据库开启失败", e);
    });
  }
};