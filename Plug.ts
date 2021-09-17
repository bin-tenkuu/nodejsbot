import {getLogger, Logger} from "log4js";
import {logger} from "./utils/logger.js";

enum State {
	create,
	installed,
	uninstalled,
	error
}

export abstract class Plug {
	public static readonly plugs: Map<string, Plug> = new Map<string, Plug>();
	public readonly module: NodeModule;
	public canAutoCall: Set<string>;
	public name: string;
	public description: string;
	public version: number;
	public error: any;
	public declare readonly __proto__: Readonly<this>;
	private static declare _logger: Logger;

	#state: State;

	protected constructor(module: NodeModule) {
		this.#state = State.create;
		this.name = this.constructor.name;
		this.module = module;
		Plug.plugs.set(this.name, this);
		this.description = "这个插件没有描述";
		this.version = -1;
		this.install = async function () {
			try {
				if (this.#state === State.error) {
					return;
				}
				if (this.#state === State.installed) {
					return;
				}
				await this.__proto__.install.call(this);
				this.logger.info("已启动 %s", this.toString());
				this.#state = State.installed;
			} catch (e) {
				this.#state = State.error;
				this.error = e;
			} finally {
				this.module.children = [];
			}
		};
		this.uninstall = async function () {
			try {
				if (this.#state === State.uninstalled) {
					return;
				}
				await this.__proto__.uninstall.call(this);
				this.logger.info("已停止 %s", this.toString());
				if (this.#state === State.error) {
					return;
				}
				this.#state = State.uninstalled;
			} catch (e) {
				this.#state = State.error;
				this.error = e;
			} finally {
				this.module.children = [];
			}
		};
		this.#state = State.uninstalled;
		this.error = undefined;
		this.canAutoCall ??= new Set();
		this.logger.debug("fix:\t" + module.filename);
	}

	/**@abstract*/
	public async install(): Promise<void> {
	}

	/**@abstract*/
	public async uninstall(): Promise<void> {
	}

	public toString() {
		return `{name: ${this.name}, version: ${this.version}}\t-> ${this.constructor.name}`;
	}

	public get installed() {
		return this.#state === State.installed;
	}

	public get state(): string {
		return State[this.#state];
	}

	public toJSON() {
		return {"name": this.name, "version": this.version, "State": this.state};
	}

	protected get logger(): Logger {
		// @ts-ignore
		return this.constructor.logger;
	}

	public static get logger(): Logger {
		if (this._logger === undefined) {
			this._logger = getLogger(this.name);
		}
		return this._logger;
	}
}

export function hrtime(time: [number, number]): void {
	let [s, ns] = process.hrtime(time);
	ns /= 1e3;
	if (ns < 1e3) {
		return logger.info(`本次请求耗时:${s}秒${ns}微秒`);
	}
	ns = (ns | 0) / 1e3;
	return logger.info(`本次请求耗时:${s}秒${ns}毫秒`);
}