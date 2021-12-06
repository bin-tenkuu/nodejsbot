/// noinspection JSUnusedLocalSymbols

import type {PlugDecorator} from "../Plug.js";
import {getLogger} from "./logger.js";

const logger = getLogger("Annotation");

interface FuncDecorator {
	(target: object, propertyKey: string | symbol): void;
}

const AutoInjectMap: Map<string, unknown> = new Map<string, unknown>();
/**
 * 使用 `* declare <TYPE>: <TYPE>;` 定义值
 * @param {string} key 关键字
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
/**
 * 使用 `* declare <TYPE>: typeof <TYPE>;` 定义值
 * @param {string} path 路径
 * @param {string} path2 对象路径
 */
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

