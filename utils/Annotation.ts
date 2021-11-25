/// noinspection JSUnusedLocalSymbols

import type {CQTag} from "go-cqwebsocket";
import type {Plug} from "../Plug.js";
import {Corpus, CorpusData, ICorpus} from "./Corpus.js";

interface PlugDecorator {
	(target: Plug, propertyKey: string): void;
}

export type canCallFunc = (data: CorpusData) => canCallRet<CQTag[] | string | number | bigint | boolean | symbol>;
export type canCallRet<T> = T | Promise<T>;

/**
 * 可以标注在 `对象属性`，`getter`，{@link canCallFunc} 方法上
 */
export function canCall(corpus: ICorpus): PlugDecorator {
	return (target: { constructor: any; }, propertyKey: string) => {
		const corpuses: Map<string, ICorpus> = canCall.get(target.constructor);
		corpuses.set(propertyKey, corpus);
	};
}
canCall.get = function (target: new() => Plug): Map<string, ICorpus> {
	let metadata: Map<string, ICorpus> | undefined = Reflect.getMetadata(canCall.name, target);
	if (metadata == null) {
		metadata = new Map<string, ICorpus>();
		Reflect.defineMetadata(canCall.name, metadata, target);
	}
	return metadata;
};
canCall.merge = function (target: Plug, corpuses: Corpus[]) {
	for (const [key, corpus] of canCall.get(<any>target.constructor)) {
		const index: number = corpuses.findIndex(value => value.weight > corpus.weight);
		if (index === -1) {
			corpuses.push(new Corpus(target, key, corpus));
		} else {
			corpuses.splice(index, 0, new Corpus(target, key, corpus));
		}
	}
};
canCall.separate = function (target: Plug, corpuses: Corpus[]) {
	for (let i = corpuses.length - 1; i >= 0; i--) {
		if (corpuses[i].plug === target) {
			corpuses.splice(i, 1);
		}
	}
};

const AutoInjectMap: Map<string, unknown> = new Map<string, unknown>();
/**
 * 使用 `private declare <TYPE>: <TYPE>;` 定义值
 * @param {string} key
 * @return {PlugDecorator}
 * @constructor
 */
export function AutoWired<T>(key?: string): PlugDecorator {
	return (target, propertyKey) => {
		return <PropertyDescriptor>{
			configurable: true,
			enumerable: false,
			get: AutoWired.define.bind(null, target, propertyKey, key ?? propertyKey),
		};
	};
}
AutoWired.set = <T>(key: string, value: T) => {
	AutoInjectMap.set(key, value);
};
AutoWired.define = <T>(target: object, propertyKey: string, key: string) => {
	if (!AutoWired.has(key)) {
		return undefined;
	}
	const value = AutoWired.get(key);
	Reflect.defineProperty(target, propertyKey, {
		configurable: true,
		enumerable: false,
		writable: false,
		value: value,
	});
	return value;
};
AutoWired.get = <T>(key: string): T | undefined => {
	return AutoInjectMap.get(key) as T | undefined;
};
AutoWired.has = <T>(key: string): boolean => {
	return AutoInjectMap.has(key);
};
