declare class globalThis {
	static require: NodeRequire;
	static logger: {
		trace(message: any, ...args: any[]): void;
		debug(message: any, ...args: any[]): void;
		info(message: any, ...args: any[]): void;
		warn(message: any, ...args: any[]): void;
		error(message: any, ...args: any[]): void;
		fatal(message: any, ...args: any[]): void;
		mark(message: any, ...args: any[]): void;
	};

	static NOP(e: any): void;
}
