const Default = Symbol();

/**筛选*/
export function* Where<T>(source: Iterable<T>, predicate: ForEachI<T, boolean>): Generator<T, void> {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			yield item;
		}
	}
}

/**映射*/
export function* Select<T, TR>(source: Iterable<T>, selector: ForEachI<T, TR>): Generator<TR, void> {
	let index: number = -1;
	for (const item of source) {
		yield selector(item, ++index);
	}
}

/**展开映射*/
export function* SelectMany<T, TC, TR>(source: Iterable<T>, collectionSelector: ForEachI<T, TC[]>,
		selector: (item: T, subItem: TC) => TR): Generator<TR, void> {
	let index: number = -1;
	for (const item of source) {
		let tcs: TC[] = collectionSelector(item, ++index);
		for (const tc of tcs) {
			yield selector(item, tc);
		}
	}
}

export function* Take<T>(source: Iterable<T>, count: number): Generator<T, void> {
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

export function* TakeWhile<T>(source: Iterable<T>, predicate: ForEachI<T, boolean>): Generator<T, void> {
	let index: number = -1;
	for (const item of source) {
		if (predicate(item, ++index)) {
			yield item;
		} else {
			break;
		}
	}
}

export function* Skip<T>(source: Iterable<T>, count: number): Generator<T, void> {
	for (const item of source) {
		if (count > 0) {
			--count;
			continue;
		}
		yield item;
	}
}

export function* SkipWhile<T>(source: Iterable<T>, predicate: ForEachI<T, boolean>): Generator<T, void> {
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

export function* GroupBy<T, TKey, TElement>(source: Iterable<T>,
		keySelector: ForEach<T, TKey>, elementSelector: ForEach<T, TElement>): Generator<[TKey, TElement[]], void> {
	const map: Map<TKey, TElement[]> = new Map<TKey, TElement[]>();
	for (const item of source) {
		const key: TKey = keySelector(item);
		const element: TElement = elementSelector(item);
		const items: TElement[] | undefined = map.get(key);
		if (items === undefined) {
			map.set(key, [element]);
		} else {
			items.push(element);
		}
	}
	for (const item of map) {
		yield item;
	}
}

/**连接*/
export function* Concat<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void> {
	yield* AsGenerator(first);
	yield* AsGenerator(second);
}

/**组合*/
export function* Zip<T1, T2, TR>(first: Iterable<T1>, second: Iterable<T2>,
		resultSelector: (item1: T1, item2: T2) => TR): Generator<TR, void> {
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

/**去重*/
export function* Distinct<T>(source: Iterable<T>): Generator<T, void> {
	const set: Set<T> = new Set();
	for (const item of source) {
		if (!set.has(item)) {
			set.add(item);
			yield item;
		}
	}
}

/**并集*/
export function* Union<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void> {
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

/**交集*/
export function* Intersect<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void> {
	const set: Set<T> = new Set(first);
	for (const item of second) {
		if (set.delete(item)) {
			yield item;
		}
	}
}

/**差集(first-second)*/
export function* Except<T>(first: Iterable<T>, second: Iterable<T>): Generator<T, void> {
	const set: Set<T> = new Set(second);
	for (const item of first) {
		if (!set.has(item)) {
			set.add(item);
			yield item;
		}
	}
}

/**反转*/
export function* Reverse<T>(source: Iterable<T>): Generator<T, void> {
	yield* AsGenerator([...source].reverse());
}

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

export function* AsGenerator<T>(source: Iterable<T>): Generator<T, void> {
	for (const item of source) {
		yield item;
	}
}

export function ToMap<T, TK, TE>(source: Iterable<T>,
		keySelector: ForEachI<T, TK>,
		elementSelector: ForEachI<T, TE>): Map<TK, TE> {
	const map: Map<TK, TE> = new Map<TK, TE>();
	let index: number = -1;
	for (const item of source) {
		map.set(keySelector(item, ++index), elementSelector(item, index));
	}
	return map;
}

export function ToArray<T>(source: Iterable<T>): T[] {
	return Array.from(source);
}

export function ToSet<T>(source: Iterable<T>): Set<T> {
	return new Set<T>(source);
}

export function* DefaultIfEmpty<T>(source: Iterable<any>, defaultValue: T): Generator<T, void> {
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

export function* Cast<T>(source: Iterable<any>): Generator<T, void> {
	yield* AsGenerator(source);
}

export function First<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T {
	const firstOrDefault: typeof Default | T = FirstOrDefault(source, predicate);
	if (firstOrDefault === Default) {
		throw new Error("No Match");
	}
	return firstOrDefault;
}

export function FirstOrNull<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | null {
	const firstOrDefault: typeof Default | T = FirstOrDefault(source, predicate);
	if (firstOrDefault === Default) {
		return null;
	}
	return firstOrDefault;
}

function FirstOrDefault<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | typeof Default {
	for (const item of source) {
		if (predicate(item)) {
			return item;
		}
	}
	return Default;
}

export function Last<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T {
	let last: T | typeof Default = LastOrDefault(source, predicate);
	if (last === Default) {
		throw new Error("No Match");
	}
	return last;
}

export function LastOrNull<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): T | null {
	let last: T | typeof Default = LastOrDefault(source, predicate);
	return last === Default ? null : last;
}

function LastOrDefault<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): T | typeof Default {
	let last: T | typeof Default = Default;
	for (const item of source) {
		if (predicate(item)) {
			last = item;
		}
	}
	return last;
}

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
	throw new Error(`Argument Out Of Range: index(${index})`);
}

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

export function* Range(start: number, count: number, step: number = 1): Generator<number, void> {
	yield start;
	for (let i = -count | 0; i < 0; ++i) {
		yield start += step;
	}
}

export function* Repeat<T>(element: T, count: number): Generator<T, void> {
	for (let i = -count | 0; i < 0; ++i) {
		yield element;
	}
}

export function Any<T>(source: Iterable<T>, predicate: ForEach<T, boolean> = _ => true): boolean {
	for (const item of source) {
		if (predicate(item)) {
			return true;
		}
	}
	return false;
}

export function All<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): boolean {
	for (const item of source) {
		if (!predicate(item)) {
			return false;
		}
	}
	return true;
}

export function Count<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): number {
	let num: number = 0;
	for (const item of source) {
		if (predicate(item)) {
			++num;
		}
	}
	return num;
}

export function BigCount<T>(source: Iterable<T>, predicate: ForEach<T, boolean>): bigint {
	let num: bigint = 0n;
	for (const item of source) {
		if (predicate(item)) {
			++num;
		}
	}
	return num;
}

export function Contains<T>(source: Iterable<T>, value: T,
		comparer: (item: T, value: T) => boolean = (l, r) => l === r): boolean {
	for (const item of source) {
		if (comparer(item, value)) {
			return true;
		}
	}
	return false;
}

export function Aggregate<T>(source: Iterable<T>, func: (acc: T, item: T) => T): T;
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

export function Sum(source: Iterable<number>, selector?: undefined): number;
export function Sum<T>(source: Iterable<T>, selector: ForEach<T, number>): number;
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
		for (const item of source) {
			sum += selector(item);
		}
	}
	return sum;
}

export function BigSum(source: Iterable<bigint>, selector?: undefined): bigint;
export function BigSum<T>(source: Iterable<T>, selector: ForEach<T, bigint>): bigint;
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
		for (const item of source) {
			sum += selector(item);
		}
	}
	return sum;
}

export function Min(source: Iterable<number>, selector?: undefined): number;
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

export function BigMin(source: Iterable<bigint>, selector?: undefined): bigint;
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

export function Max(source: Iterable<number>, selector?: undefined): number;
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

export function BigMax(source: Iterable<bigint>, selector?: undefined): bigint;
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

export function Average(source: Iterable<number>, selector?: undefined): number;
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
		throw new Error("Argument Cannot be undefined (selector)");
	}
}

export function BigAverage(source: Iterable<bigint>, selector?: undefined): bigint;
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

export function* Append<T>(source: Iterable<T>, ...elements: T[]): Generator<T, void> {
	yield* AsGenerator(source);
	yield* AsGenerator(elements);
}

export function* Prepend<T>(source: Iterable<T>, ...elements: T[]): Generator<T, void> {
	yield* AsGenerator(elements);
	yield* AsGenerator(source);
}


export function* LoopGen<T>(source: Iterable<T>): Generator<T, never, never> {
	while (true) {
		yield* AsGenerator(source);
	}
}

type ForEachI<T, TReturn> = (item: T, index: number) => TReturn;
type ForEach<T, TReturn> = (item: T) => TReturn;