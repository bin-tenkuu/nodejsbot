import {canCall} from "@U/Annotation.js";
import {Logable} from "@U/logger.js";
import type {JSONable} from "@U/Models.js";
import type {Corpus} from "@U/Corpus.js";

const State = {
	create: 0,
	installed: 1,
	uninstalled: 2,
	error: 3,
} as const;

export abstract class Plug extends Logable implements JSONable {
	public static readonly plugs: Map<new() => Plug, Plug> = new Map();
	public static readonly corpus: Corpus[] = [];

	/**获取当前类的实例*/
	public static getInst<T extends Plug>(this: new() => T): T {
		let instance: Plug | undefined = Plug.plugs.get(this);
		if (!(instance instanceof this)) {
			instance = new this();
			Plug.plugs.set(this, instance);
		}
		return <T>instance;
	}

	public readonly module: NodeModule;
	public declare readonly __proto__: Readonly<this>;
	public description: string = "这个插件没有描述";
	public _error: any = null;
	public name: string = this.constructor.name;
	#state: typeof State[keyof typeof State] = State.create;

	protected constructor(module: NodeModule) {
		super();
		this.module = module;
		this.#init();
	}

	public async install(): Promise<void> {
	}

	public async uninstall(): Promise<void> {
	}

	public override toString() {
		return `${this.constructor.name} {name: ${this.name}, State: ${this.#state}}`;
	}

	public toJSON() {
		return {"name": this.name, "description": this.description, "State": this.state};
	}

	#init(): void {
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
				canCall.merge(this, Plug.corpus);
				this.logger.info("已启动\t" + this.toString());
			} catch (e) {
				this.error = e;
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
				canCall.separate(this, Plug.corpus);
				this.logger.info("已停止\t" + this.toString());
			} catch (e) {
				this.error = e;
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

	public get state(): string {
		return Object.entries(State).find(v => v[1] === this.#state)?.[0] ?? "unknown";
	}

	public get corpus(): Corpus[] {
		return Plug.corpus.filter(v => v.plug === this);
	}
}
