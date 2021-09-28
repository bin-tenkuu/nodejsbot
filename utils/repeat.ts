import Cache from "node-cache";

export type IEqual<T> = (l: T, r: T) => boolean;

export class DataCache<TKey extends Cache.Key, TValue> {
	public _equatable: IEqual<TValue>;
	private cache: Cache;

	/**
	 *
	 * @param options 未明确指定时,不克隆,过期时间10min,过期后删除
	 * @param equatable 比较器,默认使用强比较
	 */
	constructor(options?: Cache.Options | undefined | null, equatable: IEqual<TValue> = (l, r) => l === r) {
		this.cache = new Cache(options ?? {useClones: false, stdTTL: 600, deleteOnExpire: true});
		this._equatable = equatable;
	}

	get(key: TKey, data?: undefined): TValue | undefined;

	get(key: TKey, data: TValue): TValue;

	get(key: TKey, data: TValue | undefined): TValue | undefined {
		let node = this.cache.get<TValue>(key);
		if (data == null) {
			return node;
		}
		if (node == null || !this._equatable(node, data)) {
			this.cache.set(key, data, 600);
			node = data;
		}
		return node;
	}

	set(key: TKey, data: TValue): void {
		this.cache.set(key, data);
	}

	has(key: TKey): boolean {
		return this.cache.has(key);
	}

}

