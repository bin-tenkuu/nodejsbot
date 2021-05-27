import {CQ, CQEvent, CQTag, CQWebSocket} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {canCallGroup, canCallPrivate} from "../utils/Annotation.js";
import {db} from "../utils/database.js";
import {hrtime} from "../utils/logger.js";
import {isAdminQQ, sendAdminQQ, sendGroup} from "../utils/Util.js";

class CQBotPokeGroup extends Plug {
  private header?: PartialSocketHandle;
  private pokeGroup: string[];
  private pokedSet: Set<number>;
  private resetTime?: NodeJS.Timeout;
  
  constructor() {
    super(module);
    this.name = "QQ群聊-戳一戳";
    this.description = "QQ群聊的戳一戳事件";
    this.version = 0.1;
    
    this.header = undefined;
    this.pokeGroup = [];
    this.pokedSet = new Set<number>();
  }
  
  async install() {
    this.init();
    this.header = (<CQWebSocket>require("./bot").default.bot).bind("on", {
      "notice.notify.poke.group": (event) => {
        let {target_id, user_id} = event.context;
        if (target_id !== event.bot.qq) {return;}
        if (this.pokedSet.has(user_id)) { return; }
        this.pokedSet.add(user_id);
        let time = process.hrtime();
        event.stopPropagation();
        let str = this.pokeGroup[Math.random() * this.pokeGroup.length | 0];
        sendGroup(event, str).catch(NOP).finally(() => {
          hrtime(time);
        });
      },
    });
    this.resetTime = this.resetTime ?? setInterval(() => {
      this.pokedSet.clear();
    }, 1000 * 60 * 30);
  }
  
  async uninstall() {
    require("./bot").default.bot.unbind(this.header);
    if (this.resetTime !== undefined) clearInterval(this.resetTime);
    this.resetTime = undefined;
    this.pokedSet.clear();
  }
  
  private init() {
    db.start(async db => {
      let all = await db.all<{ text: string }[]>(`select text from pokeGroup`);
      this.pokeGroup = all.map(v => v.text);
      await db.close();
    }).catch(NOP);
  }
  
  /**
   * { control?: string, other?: string }
   * @param event
   * @param execArray
   */
  @canCallPrivate()
  @canCallGroup()
  async runPrivate(event: CQEvent<"message.private"> | CQEvent<"message.group">,
      execArray: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
    let {control, other} = execArray.groups as { control?: string, other?: string } ?? {};
    if (control === undefined) return [];
    switch (control) {
      case "设置":
        event.bot.once("message.private", event => {
          if (!isAdminQQ(event)) {return; }
          let tags = event.cqTags.map(tag => {
            if (tag.tagName === "text") return tag;
            if (tag.tagName === "image") return CQ.image(tag.get("url"));
            return CQ.text(`未支持tag:` + tag.tagName);
          }).join("");
          db.start(async db => {
            await db.run(`insert into pokeGroup(text) values(?)`, tags);
            this.pokeGroup.push(tags);
            await db.close();
          }).catch(NOP);
          console.log(tags);
          sendAdminQQ(event, tags);
        });
        return [CQ.text("请发送")];
      case "删除":
        return db.start(async db => {
          if (other === undefined) return [];
          let matches = other.match(/\d+\s+/g) ?? [];
          let statement = await db.prepare("delete from pokeGroup where id=?");
          for (let match of matches) {
            await statement.run(matches);
          }
          await statement.finalize();
          let all = await db.all<{ text: string }[]>("select text from pokeGroup");
          this.pokeGroup = all.map(v => v.text);
          await db.close();
          return [CQ.text("已删除:" + matches.join(","))];
        });
      default:
        return [];
    }
  }
}

export default new CQBotPokeGroup();