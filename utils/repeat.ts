import NodeCache from "node-cache";

export abstract class Equatable {
	abstract equal(obj: any): boolean;
}

export class RepeatCacheNode<T> extends Equatable {
	public msg: T;
	public user: Set<number>;

	constructor(msg: T) {
		super();
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

	public equal(obj: any): boolean {
		if (obj == undefined) return false;
		if (obj instanceof RepeatCacheNode) {
			return this.msg == obj.msg;
		}
		return false;
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

	get(group: number, data?: undefined): T | undefined;
	get(group: number, data: T): T;
	get(group: number, data: T | undefined): T | undefined {
		let node = this.cache.get<T>(group);
		if (data === undefined) {
			return node;
		}
		if (node === undefined || node !== data) {
			if (!(node instanceof Equatable) ||
				 node instanceof Equatable && !node.equal(data)) {
				this.cache.set(group, data, 600);
			}
		}
		return node;
	}

	set(group: number, data?: T | undefined): void {
		if (data === undefined) {
			this.cache.del(group);
			return;
		}
		this.cache.set(group, data);
	}
}

