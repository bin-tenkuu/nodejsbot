import {existsSync, openSync} from "fs";
import {Database, open as openSqlite} from "sqlite";
import {Database as Database3, Statement} from "sqlite3";
import {logger} from "./logger";

type DatabaseHandle = (this: void, db: Database<Database3, Statement>) => Promise<void>;

export var db = new class SQLControl {
  private readonly lists: ((db: Database<Database3, Statement>) => Promise<void>)[];
  private readonly path: string;
  private running: boolean;
  private weakMap: WeakMap<DatabaseHandle, (success: boolean) => void>;
  
  constructor(path = "./db.db") {
    this.lists = [];
    this.running = false;
    if (!existsSync(path)) {
      openSync(path, "w");
    }
    this.path = path;
    this.weakMap = new WeakMap();
  }
  
  public async start(fun: DatabaseHandle = async () => {}): Promise<boolean> {
    this.lists.push(fun);
    let promise = new Promise<boolean>((resolve) => {
      this.weakMap.set(fun, resolve);
    });
    if (this.running) {
      return promise;
    }
    this.running = true;
    try {
      let db = await openSqlite({
        filename: this.path,
        driver: Database3,
      });
      while (this.lists.length > 0) {
        let shift = this.lists.shift();
        if (shift === undefined) continue;
        let res = this.weakMap.get(shift);
        try {
          await shift(db);
          res?.(true);
        } catch (e) {
          res?.(false);
          console.log("执行失败");
        }
      }
      this.running = false;
      try {
        await db.close();
      } catch (e) {
        console.error("数据库关闭失败", e);
      }
    } catch (e) {
      this.running = false;
      logger.error("数据库开启失败", e);
    }
    return promise;
  }
};