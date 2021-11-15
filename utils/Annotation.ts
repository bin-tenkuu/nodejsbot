import {CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {Corpus, Group, ICorpus, Member} from "./Models.js";

interface FunctionDecorator<T extends Function = Function, O extends Object = Object, Key extends PropertyKey = PropertyKey> {
	<F extends T = T>(target: O, propertyKey: Key, descriptor: TypedPropertyDescriptor<F>): void;
}

export type canCallPrivateFunc<R extends CQTag[] = CQTag[]> =
		(event: CQEvent<"message.private">, exec: RegExpExecArray, member: Member) => canCallRet<R>;
export type canCallGroupFunc<R extends CQTag[] = CQTag[]> =
		(event: CQEvent<"message.group">, exec: RegExpExecArray, member: Member, group: Group) => canCallRet<R>;
export type canCallType = canCallPrivateFunc | canCallGroupFunc;
export type canCallRet<R extends CQTag[] = CQTag[]> = R | Promise<R>;

export function canCall<T extends Plug>(corpus: ICorpus): FunctionDecorator<canCallType, T, string> {
	return (target, propertyKey) => {
		const corpuses: Map<string, ICorpus> = canCall.get(<any>target.constructor);
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
canCall.merge = function <T extends Plug>(target: T) {
	for (const [key, corpus] of canCall.get(<any>target.constructor)) {
		const index: number = Plug.corpus.findIndex(value => value.weight > corpus.weight);
		if (index === -1) {
			Plug.corpus.push(new Corpus(target, key, corpus));
		} else {
			Plug.corpus.splice(index, 0, new Corpus(target, key, corpus));
		}
	}
};
canCall.separate = function <T extends Plug>(target: T) {
	for (let i = Plug.corpus.length - 1; i >= 0; i--) {
		if (Plug.corpus[i].plug === target) {
			Plug.corpus.splice(i, 1);
		}
	}
};
