import {Logable} from "./utils/logger.js";

const State = {
	create: 0,
	installed: 1,
	uninstalled: 2,
	error: 3,
} as const;

export abstract class Plug extends Logable {
	public static readonly plugs: Map<string, Plug> = new Map<string, Plug>();
	public readonly module: NodeModule;
	public canAutoCall: Set<string>;
	public name: string;
	public description: string;
	public version: number;
	public declare readonly __proto__: Readonly<this>;
	#state: typeof State[keyof typeof State];

	protected constructor(module: NodeModule) {
		super();
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
				this.logger.info("已启动\t" + this.toString());
				this.#state = State.installed;
			} catch (e) {
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
				this.logger.info("已停止\t" + this.toString());
				if (this.#state === State.error) {
					return;
				}
				this.#state = State.uninstalled;
			} catch (e) {
				this.error = e;
			} finally {
				this.module.children = [];
			}
		};
		this.#state = State.uninstalled;
		this._error = undefined;
		this.canAutoCall ??= new Set();
		this.logger.debug("fix:\t" + module.filename);
	}

	public static hrtime(time: [number, number], msg: string = "本次请求"): void {
		let [s, ns] = process.hrtime(time);
		ns /= 1e3;
		if (ns < 1e3) {
			return this.logger.info(`耗时:${s}秒${ns}微秒:\t${msg}`);
		}
		ns = (ns | 0) / 1e3;
		return this.logger.info(`耗时:${s}秒${ns}毫秒:\t${msg}`);
	}

	public async install(): Promise<void> {
	}

	public async uninstall(): Promise<void> {
	}

	public toString() {
		return `${this.constructor.name} {name: ${this.name}, version: ${this.version}, State: ${this.#state}`;
	}

	public toJSON() {
		return {"name": this.name, "version": this.version, "State": this.state};
	}

	[Symbol.toStringTag](): string {
		return this.constructor.name;
	}

	public _error: any;

	public get error() {
		return this._error;
	}

	public set error(e: any) {
		this.#state = State.error;
		this._error = e;
		this.logger.error(e);
	}

	public get installed() {
		return this.#state === State.installed;
	}

	public get state(): number {
		return this.#state;
	}
}
