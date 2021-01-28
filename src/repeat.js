const NodeCache = require("node-cache");

class Node {
  constructor(msg) {
    this.msg = msg;
    this.user = new Set();
  }
  
  set users(user) {
    this.user.add(user);
  }
  
  /**
   *
   * @return {number}
   */
  get times() {
    return this.user.size;
  }
}

class RepeatCache {
  constructor() {
    this.cache = new NodeCache({useClones: false, stdTTL: 120});
  }
  
  /**
   *
   * @param {number}group
   * @param {number}user
   * @param {string}msg
   * @param {number}times
   * @return {boolean}
   */
  check(group, user, msg, times) {
    /**
     *
     * @type {Node}
     */
    let g = this.cache.get(group);
    if (!g || g.msg !== msg) {
      g = new Node(msg);
      this.cache.set(group, g);
    }
    let t = g.times === times;
    g.users = user;
    
    return !t && g.times === times;
  }
}


/**
 *
 * @param {string} message
 */
module.exports = RepeatCache;