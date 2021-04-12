import * as fs from "fs";
import * as sqlite from "sqlite";
import * as sqlite3 from "sqlite3";

export async function open(path = "./database.db"): Promise<sqlite.Database> {
  if (!fs.existsSync(path)) {
    fs.openSync(path, "w");
  }
  return sqlite.open({
    filename: path,
    driver: sqlite3.Database,
  });
}

{
  open().then(db => {
    db.run(`create table if not exists Members (
        id   Integer(11) not null,
        name Varchar(7) default '',
        exp  Integer default 0,
        primary key (id)
    )`).then(value => {
      console.log(value);
    });
  });
}