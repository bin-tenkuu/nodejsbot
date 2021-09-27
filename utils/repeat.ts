import Cache from "node-cache";

export type IEqual<T> = (l: T, r: T) => boolean;

export class DataCache<T> {
	public _equatable: IEqual<T>;
	private cache: Cache;

	/**
	 *
	 * @param options 未明确指定时,不克隆,过期时间1h,过期后删除
	 * @param equatable 比较器,默认使用强比较
	 */
	constructor(options?: Cache.Options | undefined | null, equatable: IEqual<T> = (l, r) => l === r) {
		this.cache = new Cache(options ?? {useClones: false, stdTTL: 600, deleteOnExpire: true});
		this._equatable = equatable;
	}

	get(key: number, data?: undefined): T | undefined;

	get(key: number, data: T): T;

	get(key: number, data: T | undefined): T | undefined {
		let node = this.cache.get<T>(key);
		if (data == null) {
			return node;
		}
		if (node == null || !this._equatable(node, data)) {
			this.cache.set(key, data, 600);
			node = data;
		}
		return node;
	}

	set(key: number, data: T): void {
		this.cache.set(key, data);
	}

	del(key: number): void {
		this.cache.del(key);
	}

	has(key: number): boolean {
		return this.cache.has(key);
	}

}

