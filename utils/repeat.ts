import NodeCache from "node-cache";

class Node<T> {
  public msg: T;
  public user: Set<number>;
  
  constructor(msg: T) {
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

export class RepeatCache<T = unknown> {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({useClones: false, stdTTL: 600, deleteOnExpire: true});
  }
  
  addData(group: number, user: number, data: T): void {
    this.getNode(group, user, data).users = user;
  }
  
  check(group: number, times: number): boolean {
    let node = this.cache.get<Node<T>>(group);
    if (node !== undefined && node.times === times) {
      node.users = 0;
      return true;
    }
    return false;
  }
  
  getNode(group: number, user: number, data: T): Node<T> {
    let node = this.cache.get<Node<T>>(group);
    if (node === undefined || node.msg !== data) {
      node = new Node(data);
      this.cache.set(group, node, 600);
    }
    return node;
  }
}

