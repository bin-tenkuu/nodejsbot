import NodeCache from "node-cache";

export type IEqual<T> = (l: T, r: T) => boolean;

export class CacheMap<K extends NodeCache.Key, V> {
	public _equatable: IEqual<V>;
	private cache: NodeCache;

	/**
	 *
	 * @param options 未明确指定时,不克隆,过期时间10min,过期后删除
	 * @param equatable 比较器,默认使用强比较
	 */
	constructor(options?: NodeCache.Options | undefined | null, equatable: IEqual<V> = (l, r) => l === r) {
		this.cache = new NodeCache(Object.assign({useClones: false, stdTTL: 600, deleteOnExpire: true}, options));
		this._equatable = equatable;
	}

	get(key: K, data: V): V;
	get(key: K, data?: undefined): V | undefined;
	get(key: K, data?: V | undefined): V | undefined {
		let node = this.cache.get<V>(key);
		if (data == null) {
			return node;
		}
		if (node == null || !this._equatable(node, data)) {
			this.cache.set(key, data, 600);
			node = data;
		}
		return node;
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}

	set(key: K, data: V, ttl?: number): void {
		this.cache.set(key, data, <number>ttl);
	}

	public get [Symbol.toStringTag]() {
		return CacheMap.name;
	}
}

