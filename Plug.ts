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

	#state: State;

	protected constructor(module: NodeModule) {
		logger.debug("fix:\t" + module.filename);
		this.#state = State.create;
		let key = this.constructor.name;
		this.module = module;
		Plug.plugs.set(key, this);
		this.name = key;
		this.description = "这个插件没有描述";
		this.version = -1;
		this.install = async function () {
			try {
				if (this.#state === State.error) return;
				if (this.#state === State.installed) return;
				await this.__proto__.install.call(this);
				logger.info("已启动 %s", this.toString());
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
				if (this.#state === State.uninstalled) return;
				await this.__proto__.uninstall.call(this);
				logger.info("已停止 %s", this.toString());
				if (this.#state === State.error) return;
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
	}

	/**@abstract*/
	public async install(): Promise<void> {}

	/**@abstract*/
	public async uninstall(): Promise<void> {}

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
}
