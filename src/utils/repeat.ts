import NodeCache from "node-cache";

class Node {
  msg: string;
  user: Set<number>;
  
  constructor(msg: string) {
    this.msg = msg;
    this.user = new Set();
  }
  
  set users(user: number) {
    this.user.add(user);
  }
  
  get times() {
    return this.user.size;
  }
}

export default class RepeatCache {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({useClones: false, stdTTL: 600});
  }
  
  check(group: number, user: number, msg: string, times: number) {
    let node = this.cache.get<Node>(group);
    if (!node || node.msg !== msg) {
      node = new Node(msg);
      this.cache.set(group, node, 600);
    }
    let t = node.times === times;
    node.users = user;
    return !t && node.times === times;
  }
}

