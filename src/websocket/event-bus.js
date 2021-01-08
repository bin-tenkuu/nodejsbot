const $get = require('lodash.get')
const events = require("events");

class CQEventBus {
  constructor() {
    this._EventMap = {
      message: {
        '': [],
        private: [],
        group: [],
        discuss: []
      },
      event: [],
      notice: {
        '': [],
        group_upload: [],
        group_admin: {
          '': [],
          set: [],
          unset: []
        },
        group_decrease: {
          '': [],
          leave: [],
          kick: [],
          kick_me: []
        },
        group_increase: {
          '': [],
          approve: [],
          invite: []
        },
        friend_add: [],
        group_ban: {
          '': [],
          ban: [],
          lift_ban: []
        }
      },
      request: {
        '': [],
        friend: [],
        group: {
          '': [],
          add: [],
          invite: []
        }
      },
      socket: {
        open: [],
        connect: [],
        error: [],
        close: []
      },
      api: {
        response: [],
        preSend: []
      },
      meta_event: {
        lifecycle: [],
        heartbeat: []
      }
    }
    this._onceListeners = new WeakMap()
  }

  /**
   *
   * @param {string|string[]}eventType
   * @param {function}handler
   */
  on(eventType, handler) {
    this.get(eventType).push(handler)
  }

  /**
   *
   * @param {string|string[]}eventType
   * @param {function}handler
   */
  once(eventType, handler) {
    const onceFunction = (...args) => {
      this.off(eventType, handler)
      return handler(...args);
    }
    this._onceListeners.set(handler, onceFunction)
    this.on(eventType, onceFunction)
  }

  /**
   *
   * @param {string|string[]}eventType
   * @param {function}handler
   */
  off(eventType, handler) {
    let functions = this.get(eventType);
    let fun = this._onceListeners.get(handler);
    fun = this._onceListeners.delete(handler) ? fun : handler;
    let indexOf = functions.indexOf(fun);
    if (indexOf >= 0) {
      functions.splice(indexOf, 1)
    }
  }

  /**
   *
   * @param {string|string[]}eventType
   * @return {function[]}
   */
  get(eventType) {
    const defaultValue = {
      get ""() {
        console.warn(`未受支持的方法类型：${eventType}`)
        return [];
      }
    }

    let arr = $get(this._EventMap, eventType, defaultValue);
    arr = arr[''] || arr
    if (arr instanceof Array) {
      return arr
    }
    return defaultValue['']
  }

  /**
   *
   * @param {string|string[]}eventType
   * @param args
   * @return {Promise<*>}
   */
  async handle(eventType, ...args) {
    let hasError = false;
    if (typeof eventType === "string") {
      eventType = eventType.split(".");
    }
    let isMSG = eventType[0] === "message";
    do {
      let arr = this.get(eventType);
      eventType.pop();
      for (let handle of arr) {
        try {
          if (await handle(...args) === true) {
            break;
          }
        } catch (e) {
          console.log(e);
          hasError = true;
          this._EventMap.socket.error.push(() => {
            this.off(eventType, handle)
          })
        }
      }
    } while (isMSG && eventType.length > 0);
    if (hasError) {
      this._EventMap.socket.error.forEach(fn => fn())
    }
  }
}

module.exports = CQEventBus
