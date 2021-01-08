const WebSocket = require('websocket').w3cwebsocket
const shortid = require('shortid')
const EventBus = require("./event-bus");

class CQWebSocket {
  constructor({
    // connectivity configs
    accessToken = '',
    baseUrl = 'ws://127.0.0.1:6700',

    // application aware configs
    qq = -1,

    // reconnection configs
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
  } = {}) {
    /**
     *
     * @type {Map<string, {onSuccess:onSuccess,onFailure:onFailure}>}
     * @private
     */
    this._responseHandlers = new Map();
    this._eventBus = new EventBus();
    if (reconnection) {
      this.reconnection = {
        times: 0,
        timesMax: reconnectionAttempts,
        delay: reconnectionDelay
      }
      this._eventBus.on("socket.close", evt => {
        if (evt.code !== 1006) return;
        if (this.reconnection.times++ < this.reconnection.timesMax) {
          setTimeout(() => {
            this.reconnect()
          }, this.reconnection.delay)
        } else {
          console.error("Number of reconnections exceeded");

        }
      })
    }

    this._qq = qq;
    this._accessToken = accessToken;
    this._baseUrl = baseUrl;
  }

  reconnect() {
    this.connect();
  }

  connect() {
    let url = `${this._baseUrl}/?access_token=${this._accessToken}`;
    this._socket = new WebSocket(`ws://v.binsrc.club:6700/?access_token=user`, undefined, {
      fragmentOutgoingMessages: false
    })
    this._socket.addEventListener("open", evt => this._open(evt))
    this._socket.addEventListener("message", evt => this._onmessage(evt))
    this._socket.addEventListener("close", evt => this._close(evt))
    this._socket.addEventListener("error", evt => this._error(evt))
    this._socket.addEventListener("connect", evt => this._connect(evt))

  }

  disconnect() {
    this._socket.close(1000, 'Normal connection closure')
  }

  /**
   *
   * @param {string}method
   * @param params
   * @return {Promise<void>}
   */
  send(method, params) {
    return new Promise((resolve, reject) => {
      let reqId = shortid.generate()

      const onSuccess = (ctxt) => {
        this._responseHandlers.delete(reqId)
        delete ctxt.echo
        resolve(ctxt)
      }

      const onFailure = (err) => {
        this._responseHandlers.delete(reqId)
        reject(err)
      }

      this._responseHandlers.set(reqId, {onSuccess, onFailure})
      const apiRequest = {
        action: method,
        params: params,
        echo: reqId
      }

      this._eventBus.handle("api.preSend", apiRequest).then(() => {
        this._socket.send(JSON.stringify(apiRequest));
      })

    })
  }

  /**
   *
   * @param {number|string}user_id  对方 QQ 号
   * @param {string}message 要发送的内容
   * @param {boolean?}auto_escape  消息内容是否作为纯文本发送 ( 即不解析 CQ 码 ) , 只在 `message` 字段是字符串时有效
   * @return {Promise<void>}
   */
  send_private_msg(user_id, message = "", auto_escape) {
    return this.send("send_private_msg", {user_id, message, auto_escape})
  }

  /**
   *
   * @param eventType
   * @param handler
   * @param {boolean?}once
   */
  on(eventType, handler, once) {
    if (once) {
      this._eventBus.once(eventType, handler)
    } else {
      this._eventBus.on(eventType, handler)
    }
    return this;
  }

  off(eventType, handler) {
    this._eventBus.off(eventType, handler)
    return this;
  }

  _open(evt) {
    console.log("open");
    console.log(evt);
    return this._eventBus.handle("socket.open", evt);
  }

  _onmessage(evt) {
    let json = JSON.parse(evt.data);
    if (json.echo) {
      let {onSuccess} = this._responseHandlers.get(json.echo) || {}

      if (typeof onSuccess === 'function') {
        onSuccess(json.data)
      }
      this._eventBus.handle("api.response", json).then()
      return;
    }
    // console.log("message");
    // console.log(evt);
    return this._handleMSG(json)
    // this.disconnect()
  }

  _connect(evt) {
    console.log("connect");
    console.log(evt);
    return this._eventBus.handle("socket.connect", evt)
  }

  _close(evt) {
    console.log("close");
    console.log(evt);
    return this._eventBus.handle("socket.close", evt)
  }

  _error(evt) {
    console.log("error");
    console.log(evt);
    return this._eventBus.handle("socket.error", evt)
  }

  _handleMSG(json) {
    let {
      post_type,
      meta_event_type
    } = json;
    switch (post_type) {
      case 'message':
        console.log(json);

        break;
      case 'notice':
        console.log(json)
        break;
      case 'request':
        console.log(json)
        break;
      case 'meta_event':
        switch (meta_event_type) {
          case 'lifecycle':
            console.log('lifecycle');
            return;
          case 'heartbeat':
            console.log("heartbeat");
            return;
          default:
            console.log(json)
            break;
        }
        break;
      default:
        console.log(json)
        break;
    }
    return this._eventBus.handle([post_type, meta_event_type], json)
  }

  /**
   * - CONNECTING = 0 连接中
   * - OPEN = 1 已连接
   * - CLOSING = 2 关闭中
   * - CLOSED = 3 已关闭
   * @return {number}
   */
  get state() {
    return this._socket.readyState.get()
  }

  get qq() {
    return this._qq
  }
}

module.exports = CQWebSocket
