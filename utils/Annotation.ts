import {CQEvent, CQTag} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {Corpus, ICorpus} from "./Models.js";

interface FunctionDecorator<T extends Function = Function, O extends Object = Object, Key extends PropertyKey = PropertyKey> {
	<F extends T = T>(target: O, propertyKey: Key, descriptor: TypedPropertyDescriptor<F>): void;
}

type canCallFunc<T extends keyof SocketHandle, R extends CQTag[] = CQTag[]> =
		T extends keyof SocketHandle ? (event: CQEvent<T>, exec: RegExpExecArray) => canCallRet<R> : never;
export type canCallType = canCallFunc<"message.group" | "message.private">;
export type canCallRet<R extends CQTag[] = CQTag[]> = R | Promise<R>;

export function canCall(corpus: ICorpus): FunctionDecorator<canCallType, Plug, string> {
	return (target, propertyKey) => {
		const corpuses: Corpus[] = canCall.get(<any>target.constructor);
		const plugCorpus: Corpus = new Corpus(<any>target.constructor, propertyKey, corpus);
		corpuses.push(plugCorpus);
		Reflect.defineMetadata(canCall.name, corpuses, target.constructor);
	};
}
canCall.get = function (target: { new(): Plug }): Corpus[] {
	return Reflect.getMetadata(canCall.name, target) ?? [];
};
canCall.merge = function (target: { new(): Plug }, corpuses: Corpus[]) {
	for (let corpus of canCall.get(target)) {
		const index: number = corpuses.findIndex(value => value.weight > corpus.weight);
		if (index === -1) {
			corpuses.push(corpus);
		} else {
			corpuses.splice(index, 0, corpus);
		}
	}
};
