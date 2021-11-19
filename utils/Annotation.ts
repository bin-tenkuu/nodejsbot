/// noinspection JSUnusedLocalSymbols

import {CQEvent, CQTag} from "go-cqwebsocket";
import {Plug} from "../Plug.js";
import {Group, Member} from "./Models.js";
import {Corpus, ICorpus} from "./Corpus.js";

interface canCallDecorator {
	<F extends canCallPrivateFunc = canCallPrivateFunc>(target: Plug, propertyKey: string,
			descriptor: TypedPropertyDescriptor<F>): void;
	<F extends canCallGroupFunc = canCallGroupFunc>(target: Plug, propertyKey: string,
			descriptor: TypedPropertyDescriptor<F>): void;
	(target: Plug, propertyKey: string): void;
}

export type canCallPrivateFunc =
		(event: CQEvent<"message.private">, exec: RegExpExecArray, member: Member) => canCallRet;
export type canCallGroupFunc =
		(event: CQEvent<"message.group">, exec: RegExpExecArray, member: Member, group: Group) => canCallRet;
export type canCallRet = CQTag[] | Promise<CQTag[]>;

/**
 * 可以标注在 `对象属性`，`getter`，{@link canCallGroupFunc} / {@link canCallPrivateFunc} 方法上
 */
export function canCall(corpus: ICorpus): canCallDecorator {
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
