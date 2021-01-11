const WebSocket = require('websocket').w3cwebsocket
const shortid = require('shortid')
const EventBus = require("./event-bus");
const {parse} = require("./tags");

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
        delay: reconnectionDelay,
        timeout: 0
      }
      this._eventBus.on("socket.close", (code) => {
        if (code !== 1006) return;
        if (this.reconnection.times++ < this.reconnection.timesMax) {
          this.reconnection.timeout = setTimeout(() => {
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

    this.messageSuccess = (ret) => {
      console.log(`发送成功`, ret.data);
    }
    this.messageFail = (reason) => {
      console.log(`发送失败`, reason);
    }

  }

  reconnect() {
    this.connect();
  }

  connect() {
    let url = `${this._baseUrl}/?access_token=${this._accessToken}`;
    this._socket = new WebSocket(url, undefined, {
      fragmentOutgoingMessages: false
    })
    this._socket.addEventListener("open", evt => this._open(evt))
    this._socket.addEventListener("message", evt => this._onmessage(evt))
    this._socket.addEventListener("close", evt => this._close(evt))
  }

  disconnect() {
    if (this.reconnection) {
      clearTimeout(this.reconnection.timeout)
      this.reconnection.timeout = 0;
    }
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
   * @param message 要发送的内容
   * @param {boolean?}auto_escape=false  消息内容是否作为纯文本发送 ( 即不解析 CQ 码 ) , 只在 `message` 字段是字符串时有效
   */
  send_private_msg(user_id, message, auto_escape = false) {
    this.send("send_private_msg", {user_id, message, auto_escape})
        .then(this.messageSuccess, this.messageFail)
  }

  /**
   *
   * @param {number|string}group_id 群号
   * @param message  要发送的内容
   * @param {boolean?}auto_escape=false 消息内容是否作为纯文本发送 ( 即不解析 CQ 码) , 只在 `message` 字段是字符串时有效
   */
  send_group_msg(group_id, message, auto_escape = false) {
    this.send("send_group_msg", {group_id, message, auto_escape})
        .then(this.messageSuccess, this.messageFail)
  }

  on(eventType, handler) {
    this._eventBus.on(eventType, handler)
    return this;
  }

  once(eventType, handler) {
    this._eventBus.once(eventType, handler)
    return this;
  }

  off(eventType, handler) {
    this._eventBus.off(eventType, handler)
    return this;
  }

  _open() {
    return this._eventBus.handle("socket.open");
  }

  _onmessage(evt) {
    let json = JSON.parse(evt.data);
    if (json.echo) {
      let {onSuccess} = this._responseHandlers.get(json.echo) || {}
      if (typeof onSuccess === 'function') {
        onSuccess(json)
      }
      this._eventBus.handle("api.response", json).then()
      return;
    }
    return this._handleMSG(json)
  }

  _close(evt) {
    if (evt.code === 1000) {
      return this._eventBus.handle("socket.close", evt.code, evt.reason)
    } else {
      return this._eventBus.handle("socket.error", evt.code, evt.reason)
    }
  }

  _handleMSG(json) {
    let post_type = json["post_type"];
    switch (post_type) {
      case 'message': {
        let messageType = json["message_type"];
        let cqTags = parse(json.message);
        switch (messageType) {
          case 'private':
          case 'discuss':
          case 'group':
            return this._eventBus.handle([post_type, messageType], json, cqTags);
          default:
            return console.warn(`未知的消息类型: ${messageType}`)
        }
      }
      case 'notice': {
        let notice_type = json["notice_type"];
        switch (notice_type) {
          case 'group_upload':
            return this._eventBus.handle([post_type, notice_type], json)
          case 'group_admin': {
            let subType = json["sub_type"];
            switch (subType) {
              case 'set':
              case 'unset':
                return this._eventBus.handle([post_type, notice_type, subType], json)
              default:
                return console.warn(`未知的 notice.group_admin 类型: ${subType}`)
            }
          }
          case 'group_decrease': {
            let subType = json["sub_type"];
            switch (subType) {
              case 'leave':
              case 'kick':
              case 'kick_me':
                return this._eventBus.handle([post_type, notice_type, subType], json)
              default:
                return console.warn(`未知的 notice.group_decrease 类型: ${subType}`)
            }
          }
          case 'group_increase': {
            let subType = json["sub_type"];
            switch (subType) {
              case 'approve':
              case 'invite':
                return this._eventBus.handle([post_type, notice_type, subType], json)
              default:
                return console.warn(`未知的 notice.group_increase 类型: ${subType}`)
            }
          }
          case 'group_ban': {
            let subType = json["sub_type"];
            switch (subType) {
              case 'ban':
              case 'lift_ban':
                return this._eventBus.handle([post_type, notice_type, subType], json)
              default:
                return console.warn(`未知的 notice.group_ban 类型: ${subType}`)
            }
          }
          case 'friend_add':
            return this._eventBus.handle([post_type, notice_type], json)
          case 'notify':
            return console.warn(`制作中 notify 类型`, json)
          default:
            return console.warn(`未知的 notice 类型: ${notice_type}`)
        }
      }
      case 'request': {
        let request_type = json["request_type"];
        switch (request_type) {
          case 'friend':
            return this._eventBus.handle([post_type, request_type], json)
          case 'group': {
            let subType = json["sub_type"];
            switch (subType) {
              case 'add':
              case 'invite':
                return this._eventBus.handle([post_type, request_type, subType], json)
              default:
                return console.warn(`未知的 request.group 类型: ${subType}`);
            }
          }
          default:
            return console.warn(`未知的 request 类型: ${request_type}`);
        }
      }
      case 'meta_event': {
        let meta_event_type = json["meta_event_type"];
        switch (meta_event_type) {
          case 'lifecycle':
          case 'heartbeat':
            return this._eventBus.handle([post_type, meta_event_type], json);
          default:
            return console.warn(`未知的 meta_event 类型: ${meta_event_type}`)
        }
      }
      default:
        return console.warn(`未知的上报类型: ${post_type}`);
    }
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
