import {CQ, CQEvent, CQTag, CQWebSocket} from "go-cqwebsocket";
import {PartialSocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug";
import {canCallPrivate} from "../utils/Annotation";
import {db} from "../utils/database";
import {logger} from "../utils/logger";
import {sendAdminQQ, sendGroup} from "../utils/Util";

class CQBotPokeGroup extends Plug {
  private header?: PartialSocketHandle;
  private pokeGroupInner: boolean;
  private pokeGroup: string[];
  
  constructor() {
    super(module);
    this.name = "QQ其他-事件";
    this.description = "QQ的各种事件，非群聊";
    this.version = 0.1;
    
    this.header = undefined;
    this.pokeGroupInner = false;
    this.pokeGroup = [];
  }
  
  async install() {
    this.init();
    this.header = (<CQWebSocket>require("./bot").bot).bind("on", {
      "notice.notify.poke.group": (event) => {
        let target_id = event.context.target_id;
        if (target_id !== event.bot.qq) {return;}
        if (this.pokeGroupInner) return;
        this.pokeGroupInner = true;
        event.stopPropagation();
        let str = this.pokeGroup[Math.random() * this.pokeGroup.length | 0];
        sendGroup(event, str);
        setTimeout(() => {
          this.pokeGroupInner = false;
          logger.info("pokeGroupInner = false");
        }, 1000 * 10);
      },
    });
  }
  
  async uninstall() {
    require("./bot").bot.unbind(this.header);
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
  async runPrivate(event: CQEvent<"message.private">, execArray: RegExpExecArray): Promise<CQTag<any>[]> {
    event.stopPropagation();
    let {control, other} = execArray.groups as { control?: string, other?: string } ?? {};
    if (control === undefined) return [];
    switch (control) {
      case "设置":
        event.bot.once("message.private", event => {
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
          let matches = other.match(/\d+(?=\s)?/g) ?? [];
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

export = new CQBotPokeGroup()