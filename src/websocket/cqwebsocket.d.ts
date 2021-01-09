/*
 * 中间
 */

interface CQWebSocketOption {
    accessToken: string
    baseUrl: string
    qq: number
    reconnection: boolean
    reconnectionAttempts: number
    reconnectionDelay: number
}

interface CQWebSocketResponse {
    data: {
        message_id: number
    }
    retcode: number
    status: string
}

type MessageEvents = 'message'
    | 'message.private'
    | 'message.discuss'
    | 'message.group'
type NoticeEvents = 'notice.group_upload'
    | 'notice.group_admin.set'
    | 'notice.group_admin.unset'
    | 'notice.group_decrease.leave'
    | 'notice.group_decrease.kick'
    | 'notice.group_decrease.kick_me'
    | 'notice.group_increase.approve'
    | 'notice.group_increase.invite'
    | 'notice.friend_add'
    | 'notice.group_ban.ban'
    | 'notice.group_ban.lift_ban'
// node
type RequestEvents = 'request.friend'
    | 'request.group.add'
    | 'request.group.invite'
// node
type SocketEvents = 'socket.open'
    | 'socket.close'
    | 'socket.error'
type APIEvents = 'api.preSend'
    | 'api.response'
type MetaEvents = 'meta_event.lifecycle'
    | 'meta_event.heartbeat'
type Events = MessageEvents
    | NoticeEvents
    | RequestEvents
    | SocketEvents
    | APIEvents
    | MetaEvents


export class CQWebSocket {
    constructor(opt?: CQWebSocketOption | any)

    reconnect(): void

    connect(): void

    disconnect(): void

    send(method: string, params: any): Promise<CQWebSocketResponse>

    on(eventType: Events | string[], handler: Function): this

    once(eventType: Events | string[], handler): this

    off(eventType: Events | string[], handler): this

    get state(): number

    get qq(): number
}