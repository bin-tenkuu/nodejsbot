import {CQEvent, CQTag} from "go-cqwebsocket";
import {SocketHandle} from "go-cqwebsocket/out/Interfaces";
import {Plug} from "../Plug.js";
import {Corpus, ICorpus} from "./Models.js";


type FunctionDecorator<T extends Function = Function, O extends Object = Object, Key extends PropertyKey = PropertyKey> =
		<F extends T = T>(target: O, propertyKey: Key, descriptor: TypedPropertyDescriptor<F>) => void;
type canCallFunc<T extends keyof SocketHandle, R extends CQTag[] = CQTag[]> =
		T extends keyof SocketHandle ? (event: CQEvent<T>, exec: RegExpExecArray) => canCallRet<R> : never;
export type canCallGroupType = canCallFunc<"message.group">;
export type canCallPrivateType = canCallFunc<"message.private">;
export type canCallType = canCallFunc<"message.group" | "message.private">;
export type canCallRet<R extends CQTag[] = CQTag[]> = R | Promise<R>;

export function canCall(corpus: ICorpus): FunctionDecorator<canCallType, Plug, string> {
	return (target, propertyKey) => {
		const plugCorpus: Corpus = new Corpus(target.constructor.name, propertyKey, corpus);
		const index: number = Plug.plugCorpus.findIndex(value => value.weight > plugCorpus.weight);
		if (index === -1) {
			Plug.plugCorpus.push(plugCorpus);
		} else {
			Plug.plugCorpus.splice(index, 0, plugCorpus);
		}
	};
}
