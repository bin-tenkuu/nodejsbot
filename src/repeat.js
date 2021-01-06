const NodeCache = require("node-cache");

class Node {
  constructor(user, msg) {
    this.msg = msg;
    this.user = new Set();
  }

  /**
   *
   * @return {number}
   */
  get times() {
    return this.user.size
  }
}

class RepeatCache {
  constructor() {
    this.cache = new NodeCache({useClones: false, stdTTL: 60})
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
      g = new Node(user, msg);
      this.cache.set(group, g);
    }
    g.user.add(user)
    if (g.times === times) {
      g.user.clear();
      return true;
    }
    return false;
  }
}


/**
 *
 * @param {string} message
 */
module.exports = RepeatCache