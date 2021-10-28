const Default = Symbol();

/**
 * 基于谓词筛选值序列。
 * @param source 要筛选的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 一个包含输入序列中满足条件的元素的 `Generator<T>`。
 * @constructor
 */
export function* Where<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): Generator<T, void, void> {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			yield item;
		}
	}
}

/**
 * 将序列中的每个元素投影到新表单。
 * @param source 一个值序列，要对该序列调用转换函数。
 * @param selector 一个应用于每个源元素的转换函数；函数的第二个参数表示源元素的索引。
 * @return 一个 `Generator<TResult>`，其元素是对 `source` 的每个元素调用转换函数得到的结果。
 * @constructor
 */
export function* Select<T, TResult>(source: Iterable<T>,
		selector: ForEach<T, TResult>): Generator<TResult, void, void> {
	let index: number = -1;
	for (const item of source) {
		yield selector(item, ++index);
	}
}

export function SelectMany<T, TCollection>(source: Iterable<T>,
		collectionSelector: ForEach<T, TCollection[]>): Generator<TCollection, void, void>;
export function SelectMany<T, TCollection, TResult>(source: Iterable<T>, collectionSelector: ForEach<T, TCollection[]>,
		selector: (item: T, subItem: TCollection) => TResult): Generator<TResult, void, void>;
/**
 * 将序列的每个元素投影到 `Iterable<T>` 并将结果序列合并为一个序列。
 * @param source 一个要投影的值序列。
 * @param collectionSelector 应用于输入序列的每个元素的转换函数。
 * @param selector 应用于中间序列的每个元素的转换函数。
 * @return 一个 `Generator<TResult>`，其元素是通过以下方法得到的：对 source 的每个元素调用一对多转换函数 collectionSelector，然后将这些序列元素中的每一个元素及其相应的源元素映射到一个结果元素。
 * @constructor
 */
export function* SelectMany<T, TCollection, TResult>(source: Iterable<T>, collectionSelector: ForEach<T, TCollection[]>,
		selector?: (item: T, subItem: TCollection) => TResult): Generator<unknown, void, void> {
	selector ??= (_, n) => n as unknown as TResult;
	let index: number = -1;
	for (const item of source) {
		for (const tc of collectionSelector(item, ++index)) {
			yield selector(item, tc);
		}
	}
}

/**
 * 从序列的开头返回指定数量的相邻元素。
 * @param source 要从其返回元素的序列。
 * @param count 要返回的元素数量。
 * @return 一个 `Generator<T>`，包含输入序列开头的指定数量的元素。
 * @constructor
 */
export function* Take<T>(source: Iterable<T>, count: number): Generator<T, void, void> {
	if (count < 0) {
		return;
	}
	for (const item of source) {
		yield item;
		if (--count === 0) {
			break;
		}
	}
}

/**
 * 如果指定的条件为 true，则返回序列中的元素，然后跳过剩余的元素。
 * @param source 要从其返回元素的序列。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 一个 `Generator<T>`，包含输入序列中出现在测试不再能够通过的元素之前的元素。
 * @constructor
 */
export function* TakeWhile<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): Generator<T, void, void> {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			yield item;
		} else {
			return;
		}
	}
}

/**
 * 跳过序列中指定数量的元素，然后返回剩余的元素。
 * @param source 要从中返回元素的 `Iterable<T>`。
 * @param count 返回剩余元素前要跳过的元素数量。
 * @return 一个 `Generator<T>`，包含输入序列中指定索引后出现的元素。
 * @constructor
 */
export function* Skip<T>(source: Iterable<T>, count: number): Generator<T, void, void> {
	for (const item of source) {
		if (count > 0) {
			--count;
			continue;
		}
		yield item;
	}
}

/**
 * 如果指定的条件为 true，则跳过序列中的元素，然后返回剩余的元素。
 * @param source 要从中返回元素的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 一个 `Generator<T>`，包含输入序列中的元素，该输入序列从线性系列中没有通过 predicate 指定测试的第一个元素开始。
 * @constructor
 */
export function* SkipWhile<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): Generator<T, void, void> {
	let index: number = -1;
	let yielding: boolean = false;
	for (const item of source) {
		if (!yielding && !predicate(item, ++index)) {
			yielding = true;
		}
		if (yielding) {
			yield item;
		}
	}
}

/**
 * 根据指定的键选择器函数对序列中的元素进行分组，并且通过使用指定的函数对每个组中的元素进行投影。
 * @param source 要对其元素进行分组的 Iterable<T>。
 * @param keySelector 用于提取每个元素的键的函数。
 * @param elementSelector 用于将每个源元素映射到 [TKey, TValue[]] 中的元素的函数。
 * @return [TKey, TValue[]]对
 * @constructor
 */
export function GroupBy<T, TKey, TValue>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector: ForEach<T, TValue>): Generator<[TKey, TValue[]], void, void>;
/**
 * 根据指定的键选择器函数对序列中的元素进行分组，并且通过使用指定的函数对每个组中的元素进行投影。
 * @param source 要对其元素进行分组的 Iterable<T>。
 * @param keySelector 用于提取每个元素的键的函数。
 * @param elementSelector 用于将每个源元素映射到 [TKey, TValue[]] 中的元素的函数。
 * @param resultSelector 用于从每个组中创建结果值的函数。
 * @return 类型为 TResult 的元素的集合，其中的每个元素都表示对一个组及其键的投影。
 * @constructor
 */
export function GroupBy<T, TKey, TValue, TResult>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector: ForEach<T, TValue>,
		resultSelector: (item: TKey, list: TValue[]) => TResult): Generator<TResult, void, void>;
export function* GroupBy<T, TKey, TValue, TResult>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector: ForEach<T, TValue>,
		resultSelector?: (item: TKey, list: TValue[]) => TResult): Generator<unknown, void, void> {
	const map: Map<TKey, TValue[]> = ToLookUp(source, keySelector, elementSelector);
	if (resultSelector === undefined) {
		yield* AsGenerator(map);
	} else {
		for (const [key, list] of map) {
			yield resultSelector(key, list);
		}
	}
}

/**
 * 根据指定的键选择器函数对序列中的元素进行分组，并且通过使用指定的函数对每个组中的元素进行投影。
 * @param outer 要联接的第一个序列。
 * @param inner 要与第一个序列联接的序列。
 * @param outerKeySelector 用于从第一个序列的每个元素提取联接键的函数。
 * @param innerKeySelector 用于从第二个序列的每个元素提取联接键的函数。
 * @param resultSelector 用于从第一个序列的元素和第二个序列的匹配元素集合中创建结果元素的函数。
 * @return 一个包含通过对两个序列执行分组联接获得的类型为 TResult 的元素的 `Generator<T>`。
 * @constructor
 */
export function* GroupJoin<TOuter, TInner, TKey, TResult>(outer: Iterable<TOuter>, inner: Iterable<TInner>,
		outerKeySelector: ForEach<TOuter, TKey>, innerKeySelector: ForEach<TInner, TKey>,
		resultSelector: (item: TOuter, innerGroup: TInner[]) => TResult): Generator<TResult, void, void> {
	const map: Map<TKey, TInner[]> = ToLookUp(inner, innerKeySelector);
	let index: number = -1;
	for (const item of outer) {
		yield resultSelector(item, map.get(outerKeySelector(item, ++index)) ?? []);
	}
}

/**
 * 基于匹配键对两个序列的元素进行关联。 使用默认的相等比较器对键进行比较。
 * @param outer 要联接的第一个序列。
 * @param inner 要与第一个序列联接的序列。
 * @param outerKeySelector 用于从第一个序列的每个元素提取联接键的函数。
 * @param innerKeySelector 用于从第二个序列的每个元素提取联接键的函数。
 * @param resultSelector 用于从两个匹配元素创建结果元素的函数。
 * @return 一个 `Generator<T>`，其中包含通过对两个序列执行内部联接获得的、类型为 TResult 的元素。
 * @constructor
 */
export function* Join<TOuter, TInner, TKey, TResult>(outer: Iterable<TOuter>, inner: Iterable<TInner>,
		outerKeySelector: ForEach<TOuter, TKey>, innerKeySelector: ForEach<TInner, TKey>,
		resultSelector: (item: TOuter, innerGroup: TInner) => TResult): Generator<TResult, void, void> {
	const map: Map<TKey, TInner[]> = ToLookUp(inner, innerKeySelector);
	let index: number = -1;
	for (const item of outer) {
		const list: TInner[] | undefined = map.get(outerKeySelector(item, ++index));
		if (list !== undefined) {
			for (const inner of list) {
				yield resultSelector(item, inner);
			}
		}
	}
}

/**
 * 按升序对序列的元素进行排序。
 * @param source 一个要排序的值序列。
 * @param keySelector 用于从元素中提取键的函数。
 * @return 一个 `Generator<TValue>`，将根据键对其元素排序。
 * @constructor
 */
export function* OrderBy<T>(source: Iterable<T>, keySelector: ForEach<T, number>): Generator<T, void, void> {
	const list = ToArray(ToLookUp(source, keySelector));
	for (const [, items] of list.sort((a, b) => a[0] - b[0])) {
		for (const item of items) {
			yield item;
		}
	}
}

/**
 * 使用指定的比较器按降序对序列的元素排序。
 * @param source 一个要排序的值序列。
 * @param keySelector 用于从元素中提取键的函数。
 * @return 一个 `Generator<TValue>`，将根据键按降序对其元素进行排序。
 * @constructor
 */
export function* OrderByDescending<T>(source: Iterable<T>, keySelector: ForEach<T, number>): Generator<T, void, void> {
	const list = ToArray(ToLookUp(source, keySelector));
	for (const [, items] of list.sort((a, b) => b[0] - a[0])) {
		for (const item of items) {
			yield item;
		}
	}
}

/**
 * 连接两个序列。
 * @param first 要连接的第一个序列。
 * @param second 要与第一个序列连接的序列。
 * @return 一个包含两个输入序列的连接元素的 `Generator<T>`。
 * @constructor
 */
export function* Concat<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void, void> {
	yield* AsGenerator(first);
	yield* AsGenerator(second);
}

export function Zip<T1, T2>(first: Iterable<T1>, second: Iterable<T2>): Generator<[T1, T2], void, void>;
export function Zip<T1, T2, TResult>(first: Iterable<T1>, second: Iterable<T2>,
		resultSelector: (item1: T1, item2: T2) => TResult): Generator<TResult, void, void>;
/**
 * 将指定函数应用于两个序列的对应元素，以生成结果序列。
 * @param first 要合并的第一个序列。
 * @param second 要合并的第二个序列。
 * @param resultSelector 用于指定如何合并这两个序列中的元素的函数。
 * @return 一个包含两个输入序列中的合并元素的 `Generator<T>`。
 * @constructor
 */
export function* Zip<T1, T2, TResult>(first: Iterable<T1>, second: Iterable<T2>,
		resultSelector?: (item1: T1, item2: T2) => TResult): Generator<unknown, void, void> {
	resultSelector ??= (item1: T1, item2: T2) => [item1, item2] as unknown as TResult;
	const t1s: Generator<T1, void> = AsGenerator(first);
	const t2s: Generator<T2, void> = AsGenerator(second);
	let next1: IteratorResult<T1, void> = t1s.next();
	let next2: IteratorResult<T2, void> = t2s.next();
	while (!next1.done && !next2.done) {
		yield resultSelector(next1.value, next2.value);
		next1 = t1s.next();
		next2 = t2s.next();
	}
}

/**
 * 通过使用默认的相等比较器对值进行比较，返回序列中的非重复元素。
 * @param source 要从中移除重复元素的序列。
 * @return 一个包含源序列中的非重复元素的 `Generator<T>`。
 * @constructor
 */
export function* Distinct<T>(source: Iterable<T>): Generator<T, void, void> {
	const set: Set<T> = new Set();
	for (const item of source) {
		if (!set.has(item)) {
			set.add(item);
			yield item;
		}
	}
}

/**
 * 生成两个序列的并集。
 * @param first 一个 `Iterable<T>`，其中的非重复元素构成并集的第一个部分。
 * @param second 一个 `Iterable<T>`，其中的非重复元素构成并集的第二个部分。
 * @return 一个 包含两个输入序列中的非重复元素的 `Generator<T>`。
 * @constructor
 */
export function* Union<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void, void> {
	const set: Set<T> = new Set();
	for (const item of first) {
		if (set.has(item)) {
			continue;
		}
		set.add(item);
		yield item;
	}
	for (const item of second) {
		if (set.has(item)) {
			continue;
		}
		set.add(item);
		yield item;
	}
}

/**
 * 对值进行比较，生成两个序列的交集。
 * @param first 一个 `Iterable<T>`，将返回其也出现在 second 中的非重复元素。
 * @param second 一个 `Iterable<T>` 序列，其中的同时出现在第一个序列中的非重复元素将被返回。
 * @return 包含组成两个序列交集的元素的序列。
 * @constructor
 */
export function* Intersect<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void, void> {
	const set: Set<T> = new Set(first);
	for (const item of second) {
		if (set.delete(item)) {
			yield item;
		}
	}
}

/**
 * 通过使用默认的相等比较器对值进行比较，生成两个序列的差集。
 * @param first 一个 `Iterable<T>`，将返回其不在 second 中的元素。
 * @param second 一个 `Iterable<T>`，其中的元素如果同时出现在第一个序列中，则将导致从返回的序列中移除这些元素。
 * @return 包含这两个序列的元素的差集的序列。
 * @constructor
 */
export function* Except<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void, void> {
	const set: Set<T> = new Set(second);
	for (const item of first) {
		if (!set.has(item)) {
			set.add(item);
			yield item;
		}
	}
}

/**
 * 反转序列中元素的顺序。
 * @param source 要反转的值序列。
 * @return 一个序列，其元素以相反顺序对应于输入序列的元素。
 * @constructor
 */
export function* Reverse<T>(source: Iterable<T>): Generator<T, void, void> {
	yield* AsGenerator([...source].reverse());
}

/**
 * 根据相等比较器确定两个序列是否相等。
 * @param first 一个用于比较 second 的 `Iterable<T>`。
 * @param second 要与第一个序列进行比较的 `Iterable<T>`。
 * @param comparer 用于比较元素的比较器。
 * @return 如果根据相应类型的默认相等比较器，两个源序列的长度相等，且其相应元素相等，则为 true；否则为 false。
 * @constructor
 */
export function SequenceEqual<T>(first: Iterable<T>, second: Iterable<T>,
		comparer: (itemL: T, itemR: T) => boolean = (l, r) => l === r): boolean {
	const t1s: Generator<T, void> = AsGenerator(first);
	const t2s: Generator<T, void> = AsGenerator(second);
	let next1: IteratorResult<T, void> = t1s.next();
	let next2: IteratorResult<T, void> = t2s.next();
	while (!next1.done) {
		if (!next2.done && !comparer(next1.value, next2.value)) {
			return false;
		}
		next1 = t1s.next();
		next2 = t2s.next();
	}
	return !!next2.done;
}

/**
 * 返回类型化为 `Generator<T>` 的输入。
 * @param source 要作为 `Iterable<T>` 键入的序列。
 * @return 已作为 `Generator<T>` 键入的输入序列。
 * @constructor
 */
export function* AsGenerator<T>(source: Iterable<T>): Generator<T, void, void> {
	for (const item of source) {
		yield item;
	}
}

/**
 * 从 `Iterable<T>` 中创建数组。
 * @param source 要从其创建数组的 `Iterable<T>`。
 * @return 一个包含输入序列中的元素的数组。
 * @constructor
 */
export function ToArray<T>(source: Iterable<T>): T[] {
	return Array.from(source);
}

export function ToMap<T, TKey>(source: Iterable<T>, keySelector: ForEach<T, TKey>): Map<TKey, T>;
export function ToMap<T, TKey, TValue>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector: ForEach<T, TValue>): Map<TKey, TValue>;
/**
 * 从 `Iterable<T>` 创建一个 `Map<TKey,TValue>`。
 * @param source 要从其创建 `Map<TKey,TValue>` 的 `Iterable<T>`。
 * @param keySelector 用于从每个元素中提取键的函数。
 * @param elementSelector 用于从每个元素产生结果元素值的转换函数。
 * @return 一个包含从输入序列中选择的类型为 TValue 的值的 `Map<TKey,TValue>`。
 * @constructor
 */
export function ToMap<T, TKey, TValue>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector?: ForEach<T, TValue>): Map<TKey, TValue> {
	elementSelector ??= item => item as unknown as TValue;
	const map: Map<TKey, TValue> = new Map<TKey, TValue>();
	let index: number = -1;
	for (const item of source) {
		map.set(keySelector(item, ++index), elementSelector(item, index));
	}
	return map;
}

export function ToLookUp<T, TKey>(source: Iterable<T>, keySelector: ForEach<T, TKey>): Map<TKey, T[]>;
export function ToLookUp<T, TKey, TValue>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector: ForEach<T, TValue>): Map<TKey, TValue[]>;
/**
 * 从 `Iterable<T>` 生成一个泛型 `Map<TKey,TValue[]>`。
 * @param source 要从其创建 `Map<TKey,TValue[]>` 的 `Iterable<T>`。
 * @param keySelector 用于从每个元素中提取键的函数。
 * @param elementSelector 用于从每个元素产生结果元素值的转换函数。
 * @return 一个包含从输入序列中选择的类型为 TElement 的值的 `Map<TKey,TValue[]>`。
 * @constructor
 */
export function ToLookUp<T, TKey, TValue>(source: Iterable<T>, keySelector: ForEach<T, TKey>,
		elementSelector?: ForEach<T, TValue>): Map<TKey, TValue[]> | Map<TKey, T[]> {
	const map: Map<TKey, TValue[]> = new Map<TKey, TValue[]>();
	let index: number = -1;
	for (const item of source) {
		const key: TKey = keySelector(item, ++index);
		const element: any = elementSelector?.(item, index) ?? item;
		const items: TValue[] | undefined = map.get(key);
		if (items === undefined) {
			map.set(key, [element]);
		} else {
			items.push(element);
		}
	}
	return map;
}

/**
 * 通过 `Iterable<T>` 创建 `Set<T>`，以用于比较键。
 * @param source 要从其创建 `Set<T>` 的 `Iterable<T>`。
 * @return 一个包含从输入序列中选择的类型为 T 的值的 `Set<T>`。
 * @constructor
 */
export function ToSet<T>(source: Iterable<T>): Set<T> {
	return new Set<T>(source);
}

/**
 * 返回指定序列中的元素；如果序列为空，则返回单一实例集合中的类型参数的默认值。
 * @param source 序列为空时返回默认值的序列。
 * @param defaultValue 序列为空时要返回的值。
 * @return 如果 source 为空，则为包含 defaultValue 的 `Generator<T>`；否则为 source。
 * @constructor
 */
export function* DefaultIfEmpty<T>(source: Iterable<any>, defaultValue: T): Generator<T, void, void> {
	const iterator: Iterator<T, void> = source[Symbol.iterator]();
	let next: IteratorResult<T, void> = iterator.next();
	if (next.done) {
		yield defaultValue;
		return;
	} else {
		do {
			yield next.value;
			next = iterator.next();
		} while (!next.done);
	}
}

/**
 * 将 `Iterable` 的元素强制转换为指定的类型。
 * @param source 序列
 * @return 一个 `Generator<T>`，其中包含已强制转换为指定类型的源序列的每个元素。
 * @constructor
 */
export function* Cast<T>(source: Iterable<any>): Generator<T, void, void> {
	yield* AsGenerator(source);
}

/**
 * 返回序列中的第一个元素。
 * @param source 要返回其第一个元素的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 返回指定序列中的第一个元素。
 * @exception 元素均不满足 predicate 中的条件。或 源序列为空。
 * @constructor
 */
export function First<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T {
	const firstOrDefault: typeof Default | T = FirstOrDefault(source, predicate);
	if (firstOrDefault === Default) {
		throw new Error("No Match");
	}
	return firstOrDefault;
}

/**
 * 返回序列中的第一个元素。
 * @param source 要返回其第一个元素的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 如果 source 为空或没有元素通过 predicate 指定的测试，则为 null，否则为 source 中通过 predicate 指定的测试的第一个元素。
 * @constructor
 */
export function FirstOrNull<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | null {
	const firstOrDefault: typeof Default | T = FirstOrDefault(source, predicate);
	if (firstOrDefault === Default) {
		return null;
	}
	return firstOrDefault;
}

function FirstOrDefault<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | typeof Default {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			return item;
		}
	}
	return Default;
}

/**
 * 返回序列的最后一个元素。
 * @param source 要返回其最后一个元素的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 源序列中最后位置处的值。
 * @exception 元素均不满足 predicate 中的条件。 或 源序列为空。
 * @constructor
 */
export function Last<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T {
	let last: T | typeof Default = LastOrDefault(source, predicate);
	if (last === Default) {
		throw new Error("No Match");
	}
	return last;
}

/**
 * 返回序列中的最后一个元素；如果未找到该元素，则返回默认值。
 * @param source 要返回其最后一个元素的 `Iterable<T>`。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 如果源序列为空，则为 null；否则为 `Iterable<T>` 中的最后一个元素。
 * @constructor
 */
export function LastOrNull<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | null {
	let last: T | typeof Default = LastOrDefault(source, predicate);
	return last === Default ? null : last;
}

function LastOrDefault<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | typeof Default {
	let last: T | typeof Default = Default;
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			last = item;
		}
	}
	return last;
}

/**
 * 返回序列中指定索引处的元素。
 * @param source 要从中返回元素的 `Iterable<T>`。
 * @param index 要检索的从零开始的元素索引。
 * @return 源序列中指定位置处的元素。
 * @exception Index Out Of Range
 * @constructor
 */
export function ElementAt<T>(source: Iterable<T>, index: number): T {
	if (index < 0) {
		throw new Error(`Argument Out Of Range: index(${index})`);
	}
	if (Array.isArray(source)) {
		return source[index];
	}
	for (const item of source) {
		if (index === 0) {
			return item;
		}
		--index;
	}
	throw new Error(`Index Out Of Range: source[${index}]`);
}

/**
 * 返回序列中指定索引处的元素；如果索引超出范围，则返回默认值。
 * @param source 要从中返回元素的 `Iterable<T>`。
 * @param index 要检索的从零开始的元素索引。
 * @return 如果索引超出源序列的边界，则为 null；否则为源序列中指定位置处的元素。
 * @constructor
 */
export function ElementAtOrNull<T>(source: Iterable<T>, index: number): T | null {
	if (index < 0) {
		return null;
	}
	if (Array.isArray(source)) {
		return source[index];
	}
	for (const item of source) {
		if (index === 0) {
			return item;
		}
		--index;
	}
	return null;
}

/**
 * 生成指定范围内的整数的序列。
 * @param start 序列中第一个整数的值。
 * @param count 要生成的顺序整数的数目。
 * @param [step=1] 步长
 * @return 包含某个范围的顺序整数
 * @constructor
 */
export function* Range(start: number, count: number, step: number = 1): Generator<number, void, void> {
	yield start;
	for (let i = Math.trunc(-count); i < 0; ++i) {
		yield start += step;
	}
}

/**
 * 生成包含一个重复值的序列。
 * @param element 要重复的值。
 * @param count 在生成序列中重复该值的次数。
 * @return 一个包含重复值的 `Iterable<T>`。
 * @constructor
 */
export function* Repeat<T>(element: T, count: number): Generator<T, void, void> {
	for (let i = -count | 0; i < 0; ++i) {
		yield element;
	}
}

/**
 * 确定序列是否包含任何元素
 * @param source 值序列
 * @param predicate 用于测试每个元素是否满足条件的函数
 * @return 如果源序列包含任何元素，则为 true；否则为 false
 * @constructor
 */
export function Any<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): boolean {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			return true;
		}
	}
	return false;
}

/**
 * 确定序列中的所有元素是否都满足条件
 * @param source 值序列
 * @param predicate 用于测试每个元素是否满足条件的函数
 * @return 如果源序列中的每个元素都通过指定谓词中的测试，或者序列为空，则为 true；否则为 false
 * @constructor
 */
export function All<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): boolean {
	let index: number = -1;
	for (const item of source) {
		if (!predicate(item, ++index)) {
			return false;
		}
	}
	return true;
}

/**
 * 返回序列中的元素数量。
 * @param source 包含要计数的元素的序列。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 输入序列中的元素数量。
 * @constructor
 */
export function Count<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): number {
	let index: number = -1;
	let num: number = 0;
	for (const item of source) {
		if (predicate(item, ++index)) {
			++num;
		}
	}
	return num;
}

/**
 * 返回序列中的元素数量。
 * @param source 包含要计数的元素的序列。
 * @param predicate 用于测试每个元素是否满足条件的函数。
 * @return 输入序列中的元素数量。
 * @constructor
 */
export function BigCount<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): bigint {
	let index: number = -1;
	let num: bigint = 0n;
	for (const item of source) {
		if (predicate(item, ++index)) {
			++num;
		}
	}
	return num;
}

/**
 * 通过使用默认的相等比较器确定序列是否包含指定的元素。
 * @param source 要在其中定位某个值的序列。
 * @param value 要在序列中定位的值。
 * @param comparer 一个对值进行比较的相等比较器。
 * @return 如果源序列包含具有指定值的元素，则为 true；否则为 false。
 * @constructor
 */
export function Contains<T>(source: Iterable<T>, value: T,
		comparer: (item: T, value: T) => boolean = (l, r) => l === r): boolean {
	for (const item of source) {
		if (comparer(item, value)) {
			return true;
		}
	}
	return false;
}

/**
 * 对序列应用累加器函数 将指定的种子值用作累加器初始值
 * @param source 值序列
 * @param func 要对每个元素调用的累加器函数
 * @return 累加器的最终值
 * @constructor
 */
export function Aggregate<T>(source: Iterable<T>, func: (acc: T, item: T) => T): T;
/**
 * 对序列应用累加器函数 将指定的种子值用作累加器的初始值，并使用指定的函数选择结果值
 * @param source 值序列
 * @param seed 累加器的初始值
 * @param func 要对每个元素调用的累加器函数
 * @return 已转换的累加器最终值
 * @constructor
 */
export function Aggregate<T, TAcc>(source: Iterable<T>, seed: TAcc, func: (acc: TAcc, item: T) => TAcc): TAcc;
export function Aggregate<T, TAcc>(source: Iterable<T>, seed: TAcc | ((acc: T, item: T) => T),
		func?: (acc: TAcc, item: T) => TAcc): TAcc {
	let accumulate: TAcc;
	if (func === undefined) {
		func = <(acc: TAcc, item: T) => TAcc><unknown>seed;
		accumulate = <TAcc><unknown>First(source);
	} else {
		accumulate = <TAcc>seed;
	}
	for (const item of source) {
		accumulate = func(accumulate, item);
	}
	return accumulate;
}

/**
 * 计算数值序列的和。
 * @param source 用于计算总和的值序列。
 * @return 序列中的值的总和。
 * @constructor
 */
export function Sum(source: Iterable<number>): number;
/**
 * 计算数值序列的和。
 * @param source 用于计算总和的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 投影值的总和。
 * @constructor
 */
export function Sum<T>(source: Iterable<T>, selector?: ForEach<T, number> | undefined): number {
	const firstOrDefault: T | typeof Default = FirstOrDefault(source);
	if (firstOrDefault === Default) {
		return 0;
	}
	let sum: number = 0;
	if (selector === undefined) {
		if (typeof firstOrDefault === "number") {
			for (const item of Cast<number>(source)) {
				sum += item;
			}
		} else {
			throw new Error(`Argument Cannot be undefined (selector)`);
		}
	} else {
		let index: number = -1;
		for (const item of source) {
			sum += selector(item, ++index);
		}
	}
	return sum;
}

/**
 * 计算数值序列的和。
 * @param source 用于计算总和的值序列。
 * @return 序列中的值的总和。
 * @constructor
 */
export function BigSum(source: Iterable<bigint>): bigint;
/**
 * 计算数值序列的和。
 * @param source 用于计算总和的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 投影值的总和。
 * @constructor
 */
export function BigSum<T>(source: Iterable<T>, selector?: ForEach<T, bigint> | undefined): bigint {
	const firstOrDefault: T | typeof Default = FirstOrDefault(source);
	if (firstOrDefault === Default) {
		return 0n;
	}
	let sum: bigint = 0n;
	if (selector === undefined) {
		if (typeof firstOrDefault === "bigint") {
			for (const item of Cast<bigint>(source)) {
				sum += item;
			}
		} else {
			throw new Error(`Argument Cannot be undefined (selector)`);
		}
	} else {
		let index: number = -1;
		for (const item of source) {
			sum += selector(item, ++index);
		}
	}
	return sum;
}

/**
 * 返回值序列中的最小值。
 * @param source 要确定其最小值的值序列。
 * @return 序列中的最小值。
 * @constructor
 */
export function Min(source: Iterable<number>): number;
/**
 * 返回值序列中的最小值。
 * @param source 要确定其最小值的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 序列中的最小值。
 * @constructor
 */
export function Min<T>(source: Iterable<T>, selector?: ForEach<T, number> | undefined): number {
	let min: T | typeof Default = FirstOrDefault(source);
	if (min === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return Min(Select(source, selector));
	} else if (typeof min === "number") {
		for (const item of source) {
			if (min > item) {
				min = item;
			}
		}
		return <number><unknown>min;
	} else {
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

/**
 * 返回值序列中的最小值。
 * @param source 要确定其最小值的值序列。
 * @return 序列中的最小值。
 * @constructor
 */
export function BigMin(source: Iterable<bigint>): bigint;
/**
 * 返回值序列中的最小值。
 * @param source 要确定其最小值的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 序列中的最小值。
 * @constructor
 */
export function BigMin<T>(source: Iterable<T>, selector?: ForEach<T, bigint> | undefined): bigint {
	let min: T | typeof Default = FirstOrDefault(source);
	if (min === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return BigMin(Select(source, selector));
	} else if (typeof min === "bigint") {
		for (const item of source) {
			if (min > item) {
				min = item;
			}
		}
		return <bigint><unknown>min;
	} else {
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

/**
 * 返回值序列中的最大值。
 * @param source 要确定其最大值的值序列。
 * @return 序列中的最大值。
 * @constructor
 */
export function Max(source: Iterable<number>): number;
/**
 * 返回值序列中的最大值。
 * @param source 要确定其最大值的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 序列中的最大值。
 * @constructor
 */
export function Max<T>(source: Iterable<T>, selector?: ForEach<T, number> | undefined): number {
	let max: T | typeof Default = FirstOrDefault(source);
	if (max === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return Max(Select(source, selector));
	} else if (typeof max === "number") {
		for (const item of source) {
			if (max < item) {
				max = item;
			}
		}
		return <number><unknown>max;
	} else {
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

/**
 * 返回值序列中的最大值。
 * @param source 应用于每个元素的转换函数。
 * @return 序列中的最大值。
 * @constructor
 */
export function BigMax(source: Iterable<bigint>): bigint;
/**
 * 返回值序列中的最大值。
 * @param source 要确定其最大值的值序列。
 * @param selector 应用于每个元素的转换函数。
 * @return 序列中的最大值。
 * @constructor
 */
export function BigMax<T>(source: Iterable<T>, selector?: ForEach<T, bigint> | undefined): bigint {
	let max: T | typeof Default = FirstOrDefault(source);
	if (max === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return BigMax(Select(source, selector));
	} else if (typeof max === "bigint") {
		for (const item of source) {
			if (max < item) {
				max = item;
			}
		}
		return <bigint><unknown>max;
	} else {
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

/**
 * 计算值序列的平均值。
 * @param source 序列
 * @return 值序列的平均值。
 * @exception 源序列为空。
 * @constructor
 */
export function Average(source: Iterable<number>): number;
/**
 * 计算值序列的平均值，这些值可通过对输入序列的每个元素调用转换函数获得。
 * @param source 序列
 * @param selector 应用于每个元素的转换函数。
 * @return 值序列的平均值。
 * @exception 源序列为空。
 * @constructor
 */
export function Average<T>(source: Iterable<T>, selector?: ForEach<T, number> | undefined): number {
	const firstOrDefault: T | typeof Default = FirstOrDefault(source);
	if (firstOrDefault === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return Average(Select(source, selector));
	} else if (typeof firstOrDefault === "number") {
		let all: number = 0;
		let count: number = 0;
		for (const item of Cast<number>(source)) {
			all += item;
			++count;
		}
		return all / count;
	} else {
		throw new Error("Argument 'selector' Cannot be undefined");
	}
}

/**
 * 计算值序列的平均值。
 * @param source 序列
 * @return 值序列的平均值。
 * @exception 源序列为空。
 * @constructor
 */
export function BigAverage(source: Iterable<bigint>): bigint;
/**
 * 计算值序列的平均值，这些值可通过对输入序列的每个元素调用转换函数获得。
 * @param source 序列
 * @param selector 应用于每个元素的转换函数。
 * @return 值序列的平均值。
 * @exception 源序列为空。
 * @constructor
 */
export function BigAverage<T>(source: Iterable<T>, selector?: ForEach<T, bigint> | undefined): bigint {
	const firstOrDefault: T | typeof Default = FirstOrDefault(source);
	if (firstOrDefault === Default) {
		throw new Error("source Cannot Be Empty");
	}
	if (selector !== undefined) {
		return BigAverage(Select(source, selector));
	} else if (typeof firstOrDefault === "bigint") {
		let all: bigint = 0n;
		let count: bigint = 0n;
		for (const item of Cast<bigint>(source)) {
			all += item;
			++count;
		}
		return all / count;
	} else {
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

/**
 * 将一个值追加到序列末尾
 * @param source 值序列
 * @param elements 要追加到 source 的值。
 * @return 以 element 结尾的新序列。
 * @constructor
 */
export function* Append<T>(source: Iterable<T>, ...elements: T[]): Generator<T, void, void> {
	yield* AsGenerator(source);
	yield* AsGenerator(elements);
}

/**
 * 向序列的开头添加值。
 * @param source 值序列。
 * @param elements 要放置在 source 前面的值。
 * @return 以 element 开头的新序列。
 * @constructor
 */
export function* Prepend<T>(source: Iterable<T>, ...elements: T[]): Generator<T, void, void> {
	yield* AsGenerator(elements);
	yield* AsGenerator(source);
}


export function* LoopGen<T>(source: Iterable<T>): Generator<T, never, never> {
	while (true) {
		let hasItem = false;
		for (let item of source) {
			yield item;
			hasItem = true;
		}
		if (!hasItem) {
			throw new Error("source is Empty");
		}
	}
}

export type ForEach<T, TReturn> = (item: T, index: number) => TReturn;
