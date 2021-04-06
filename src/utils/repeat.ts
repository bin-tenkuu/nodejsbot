import NodeCache from "node-cache";

class Node<T> {
  msg: T;
  user: Set<number>;
  
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

export default class RepeatCache<T = unknown> {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({useClones: false, stdTTL: 600});
  }
  
  /**
   *
   * @param group
   * @param user
   * @param data
   * @param times 秒(s)
   */
  setTime(group: number, user: number, data: T, times = 600): Node<T> {
    let node = this.getNode(group, user, data);
    this.cache.set(group, node, times);
    return node;
  }
  
  check(group: number, user: number, data: T, times: number) {
    let node = this.getNode(group, user, data);
    let t = node.times === times;
    node.users = user;
    return !t && node.times === times;
  }
  
  getNode(group: number, user: number, data: T): Node<T> {
    let node = this.cache.get<Node<T>>(group);
    if (!node || node.msg !== data) {
      node = new Node(data);
      this.cache.set(group, node, 600);
    }
    return node;
  }
}

