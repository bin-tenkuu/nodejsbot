import {Logable} from "./utils/logger.js";
import {Corpus} from "./utils/Models.js";

const State = {
	create: 0,
	installed: 1,
	uninstalled: 2,
	error: 3,
} as const;

export abstract class Plug extends Logable {
	public static readonly plugs: Map<string, Plug> = new Map();
	public static readonly corpus: Corpus[] = [];
	public static readonly plugTypes: Map<{ new(): Plug }, Plug> = new Map();

	public static get<T extends Plug>(type: { new(): T }): T {
		let instance: Plug | undefined = this.plugTypes.get(type);
		if (instance == null || !(instance instanceof type)) {
			instance = new type();
			this.plugTypes.set(type, instance);
		}
		return <T>instance;
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

	public readonly module: NodeModule;
	public description: string = "这个插件没有描述";
	public declare readonly __proto__: Readonly<this>;
	public _error: any = null;
	public name: string = this.constructor.name;
	#state: number = State.create;

	protected constructor(module: NodeModule) {
		super();
		this.module = module;
		this.#init();
	}

	public async install(): Promise<void> {
	}

	public async uninstall(): Promise<void> {
	}

	public toString() {
		return `${this.constructor.name} {name: ${this.name}, State: ${this.#state}}`;
	}

	public toJSON() {
		return {"name": this.name, "State": this.state};
	}

	[Symbol.toStringTag](): string {
		return this.constructor.name;
	}

	#init(): void {
		Plug.plugs.set(this.constructor.name, this);
		this.install = async function () {
			try {
				if (this.#state === State.error) {
					return;
				}
				if (this.#state === State.installed) {
					return;
				}
				await this.__proto__.install.call(this);
				this.#state = State.installed;
			} catch (e) {
				this.error = e;
			} finally {
				this.logger.info("已启动\t" + this.toString());
			}
		};
		this.uninstall = async function () {
			try {
				if (this.#state === State.uninstalled) {
					return;
				}
				await this.__proto__.uninstall.call(this);
				if (this.#state === State.error) {
					return;
				}
				this.#state = State.uninstalled;
			} catch (e) {
				this.error = e;
			} finally {
				this.logger.info("已停止\t" + this.toString());
			}
		};
		this.#state = State.uninstalled;
		this.logger.debug("init:\t" + this.module.filename);
	}

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

	public get corpus(): Corpus[] {
		return Plug.corpus.filter(value => value.plug === this.constructor);
	}
}
