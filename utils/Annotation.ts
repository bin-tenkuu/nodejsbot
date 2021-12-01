/// noinspection JSUnusedLocalSymbols

import type {CQTag} from "go-cqwebsocket";
import type {Plug} from "../Plug.js";
import {Corpus, CorpusData, ICorpus} from "./Corpus.js";
import {getLogger} from "@U/logger.js";

const logger = getLogger("Annotation");

interface PlugDecorator {
	(target: Plug, propertyKey: string): void;
}

interface FuncDecorator {
	(target: object, propertyKey: string | symbol): void;
}

export type canCallFunc = (data: CorpusData) => canCallRet;
export type canCallType = CQTag | string | number | bigint | boolean | symbol | canCallType[];
export type canCallRet = canCallType | void | Promise<canCallType | void>;

/**
 * 可以标注在 `对象属性`，`getter`，{@link canCallFunc} 方法上<br/>
 * **注：**当目标**不是**方法时，将会自动停止冒泡
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
		const message: string = `AutoWired Not Found: ${key}`;
		logger.error(message);
		throw message;
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
export function LazyRequire(path: string, path2: string): FuncDecorator {
	return (target, propertyKey) => {
		return <PropertyDescriptor>{
			configurable: true,
			enumerable: false,
			get: LazyRequire.define.bind(null, target, propertyKey, path, path2),
		};
	};
}
LazyRequire.define = <T>(target: object, propertyKey: string | symbol, path: string, path2: string) => {
	const value = LazyRequire.get(path, path2);
	Reflect.defineProperty(target, propertyKey, {
		configurable: true,
		enumerable: false,
		writable: false,
		value: value,
	});
	return value;
};
LazyRequire.get = (path: string, path2: string) => {
	return global.require(path)[path2];
};
