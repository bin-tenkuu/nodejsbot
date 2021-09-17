import {CQEvent, CQTag} from "go-cqwebsocket";
import "reflect-metadata";
import {Plug} from "../Plug.js";

type Constructor = { new(...args: any): any };
type FunctionDecorator<T extends Function = Function, O extends Object = Object, Key extends PropertyKey = PropertyKey> =
		<F extends T = T>(target: O, propertyKey: Key, descriptor: TypedPropertyDescriptor<F>) => void;
type ConstructorDecorator<T extends Constructor = Constructor> = <F extends T>(constructor: F) => F | void;
type PropertyDecorator<O extends Object = Object, Key extends PropertyKey = PropertyKey> =
		(target: O, propertyKey: Key) => void;
type ParameterDecorator<O extends Object = Object, Key extends PropertyKey = PropertyKey> =
		(target: O, propertyKey: Key, parameterIndex: number) => void;

export enum Design {
	type = "design:type",
	paramTypes = "design:paramtypes",
	returnType = "design:returntype"
}

export function logFuncCall(): FunctionDecorator {
	return function (target, propertyKey, descriptor) {
		if (typeof descriptor.value === "function") {
			const value: Function = descriptor.value;
			// @ts-ignore
			descriptor.value = function (...args: any[]) {
				const metadata = Reflect.getMetadata("custom:log", target) ?? {};
				const array: boolean[] = metadata[propertyKey as any] ?? [];
				array.filter(v => v).forEach((v, i) => {
					console.log(`${Date()} ${target.constructor.name}["${String(propertyKey)}"][param at ${i}] = ${args[i]}`);
				});
				console.log(`${Date()} ${target.constructor.name}["${String(propertyKey)}"] be Called`);
				return value.call(this, ...args);
			};
		}
		if (typeof descriptor.get === "function") {
			const get = descriptor.get;
			descriptor.get = function () {
				console.log(`${Date()} ${target.constructor.name}["get ${String(propertyKey)}"] be Called`);
				return get.call(this);
			};
		}
		if (typeof descriptor.set === "function") {
			const set = descriptor.set;
			descriptor.set = function (value) {
				console.log(`${Date()} ${target.constructor.name}["set ${String(propertyKey)}"] be Called`);
				set.call(this, value);
			};
		}
	};
}

export function logCreate(name?: string): ConstructorDecorator {
	return (constructor) => {
		return class extends constructor {
			constructor(...args: any[]) {
				super(...args);
				console.log(`${Date()} ${name ?? this.constructor.name} newed an instance`);
			}
		};
	};
}

export function logProp(): PropertyDecorator {
	return function (target, propertyKey) {
		const s = "_" + String(propertyKey);
		Object.defineProperty(target, propertyKey, {
			get() {
				console.log(`${Date()} get ${String(propertyKey)}`);
				return this[s];
			},
			set(v) {
				console.log(`${Date()} set ${String(propertyKey)} => ${v}`);
				this[s] = v;
			},
			configurable: true,
			enumerable: true,
		});
	};
}

export function logParam(): ParameterDecorator {
	return function (target, propertyKey, parameterIndex) {
		const metadata: { [k in PropertyKey]?: boolean[] } = Reflect.getMetadata("custom:log", target) ?? {};
		const array = metadata[propertyKey as any] ?? [];
		array[parameterIndex] = true;
		metadata[propertyKey as any] = array;
		Reflect.defineMetadata("custom:log", metadata, target);
	};
}

export type canCallGroupType = (event: CQEvent<"message.group">, exec: RegExpExecArray) => Promise<CQTag[]>
export type canCallPrivateType = (event: CQEvent<"message.private">, exec: RegExpExecArray) => Promise<CQTag[]>

export function canCallGroup(): FunctionDecorator<canCallGroupType, Plug, string> {
	return (target, propertyKey, descriptor) => {
		if (descriptor.value === undefined) {
			throw new Error("canCallGroup() can Only Decorator Function");
		}
		target.canAutoCall ??= new Set<string>();
		target.canAutoCall.add(propertyKey);
		Reflect.defineMetadata(canCallGroup.name, true, descriptor.value);
	};
}

export function canCallPrivate(): FunctionDecorator<canCallPrivateType, Plug, string> {
	return (target, propertyKey, descriptor) => {
		if (descriptor.value === undefined) {
			throw new Error("canCallPrivate() can Only Decorator Function");
		}
		target.canAutoCall ??= new Set<string>();
		target.canAutoCall.add(propertyKey);
		Reflect.defineMetadata(canCallPrivate.name, true, descriptor.value);
	};
}
