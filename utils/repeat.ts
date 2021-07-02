import NodeCache from "node-cache";

class Node<T> {
	public msg: T;
	public user: Set<number>;

	constructor(msg: T) {
		this.msg = msg;
		this.user = new Set();
	}

	addUser(user: number): boolean {
		let b: boolean = this.user.has(user);
		b || this.user.add(user);
		return !b;
	}

	get times(): number {
		return this.user.size;
	}
}

export class RepeatCache<T = unknown> {
	private cache: NodeCache;

	/**
	 *
	 * @param options 未明确指定时,不克隆,过期时间1h,过期后删除
	 */
	constructor(options?: NodeCache.Options) {
		this.cache = new NodeCache(options ?? {useClones: false, stdTTL: 600, deleteOnExpire: true});
	}

	get(group: number, data?: undefined): Node<T> | undefined
	get(group: number, data: T): Node<T>
	get(group: number, data: T | undefined): Node<T> | undefined {
		let node = this.cache.get<Node<T>>(group);
		if (data === undefined) {
			return node;
		}
		if (node === undefined || node.msg !== data) {
			node = new Node(data);
			this.cache.set(group, node, 600);
		}
		return node;
	}
}

