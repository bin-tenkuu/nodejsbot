import Cache from "node-cache";

export class Equatable {
	equal(obj: any): boolean {
		return obj != null && this === obj;
	}
}

export class DataCache<T extends Equatable> {
	private cache: Cache;

	/**
	 *
	 * @param options 未明确指定时,不克隆,过期时间1h,过期后删除
	 */
	constructor(options?: Cache.Options) {
		this.cache = new Cache(options ?? {useClones: false, stdTTL: 600, deleteOnExpire: true});
	}

	get(group: number, data?: undefined): T | undefined;
	get(group: number, data: T): T;
	get(group: number, data: T | undefined): T | undefined {
		let node = this.cache.get<T>(group);
		if (data == null) {
			return node;
		}
		if (node == null || node !== data || !node.equal(data)) {
			this.cache.set(group, data, 600);
			node = data;
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

