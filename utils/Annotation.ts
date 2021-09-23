import {CQEvent, CQTag} from "go-cqwebsocket";
import "reflect-metadata";
import {Plug} from "../Plug.js";


type FunctionDecorator<T extends Function = Function, O extends Object = Object, Key extends PropertyKey = PropertyKey> =
		<F extends T = T>(target: O, propertyKey: Key, descriptor: TypedPropertyDescriptor<F>) => void;

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
