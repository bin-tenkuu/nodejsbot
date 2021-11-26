// noinspection JSUnusedGlobalSymbols

declare module "node-expat" {
	// Type definitions for node-expat 2.4.0
	import {Stream} from "stream";

	export class Parser extends Stream {
		// Stream API
		writable: boolean;

		// encoding: string;
		readable: boolean;

		constructor(encoding?: string);

		_getNewParser(): Parser;

		// emit(): Function;

		parse(buf: Buffer | string, isFinal?: boolean): boolean;

		setEncoding(encoding: BufferEncoding): void;

		setUnknownEncoding(map: number[], convert?: string): void;

		getError(): string;

		stop(): void;

		pause(): void;

		resume(): void;

		destroy(): void;

		destroySoon(): void;

		write(data: Buffer | string): boolean;

		end(buf: Buffer | string): void;

		reset(): void;

		getCurrentLineNumber(): number;

		getCurrentColumnNumber(): number;

		getCurrentByteIndex(): number;
	}

	export function createParser(cb?: (...args: any[]) => void): Parser;

}
