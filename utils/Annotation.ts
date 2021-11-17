/// noinspection JSUnusedLocalSymbols

import {CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {Corpus, Group, ICorpus, Member} from "./Models.js";

interface canCallDecorator<T extends Plug = Plug> {
	<F extends canCallPrivateFunc = canCallPrivateFunc>(target: T, propertyKey: string,
			descriptor: TypedPropertyDescriptor<F>): void;
	<F extends canCallGroupFunc = canCallGroupFunc>(target: T, propertyKey: string,
			descriptor: TypedPropertyDescriptor<F>): void;
	(target: T, propertyKey: string): void;
}

export type canCallPrivateFunc =
		(event: CQEvent<"message.private">, exec: RegExpExecArray, member: Member) => canCallRet;
export type canCallGroupFunc =
		(event: CQEvent<"message.group">, exec: RegExpExecArray, member: Member, group: Group) => canCallRet;
export type canCallRet = CQTag[] | Promise<CQTag[]>;

/**
 * 可以标注在 `对象属性`，`getter`，{@link canCallGroupFunc} / {@link canCallPrivateFunc} 方法上
 */
export function canCall<T extends Plug>(corpus: ICorpus): canCallDecorator<T> {
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
canCall.merge = function (target: Plug) {
	for (const [key, corpus] of canCall.get(<any>target.constructor)) {
		const index: number = Plug.corpus.findIndex(value => value.weight > corpus.weight);
		if (index === -1) {
			Plug.corpus.push(new Corpus(target, key, corpus));
		} else {
			Plug.corpus.splice(index, 0, new Corpus(target, key, corpus));
		}
	}
};
canCall.separate = function (target: Plug) {
	for (let i = Plug.corpus.length - 1; i >= 0; i--) {
		if (Plug.corpus[i].plug === target) {
			Plug.corpus.splice(i, 1);
		}
	}
};
