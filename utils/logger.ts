import {
	BaseLayout, ColoredLayout, Configuration, configure, ConsoleAppender, DateFileAppender, getLogger as getter, Logger,
	LogLevelFilterAppender, SyncfileAppender,
} from "log4js";

configure(<Configuration>{
	appenders: {
		"consoleLog": <ConsoleAppender>{
			type: "console",
			layout: <ColoredLayout>{
				type: "coloured",
			},
		},
		"warn": <DateFileAppender>{
			type: "dateFile",
			filename: "./logs/Warn.log",
			pattern: "yyyy-MM-dd",
			encoding: "utf-8",
			compress: false,
			alwaysIncludePattern: true,
			daysToKeep: 10,
			keepFileExt: true,
			layout: <BaseLayout>{
				type: "basic",
			},
		},
		"trace": <SyncfileAppender>{
			type: "fileSync",
			filename: "./logs/Trace.log",
			backups: 5,
			maxLogSize: 1024 * 10,
			layout: <BaseLayout>{
				type: "basic",
			},
		},
		"traceLog": <LogLevelFilterAppender>{
			type: "logLevelFilter",
			level: "TRACE",
			appender: "trace",
			maxLevel: "INFO",
		},
		"warnLog": <LogLevelFilterAppender>{
			type: "logLevelFilter",
			level: "WARN",
			appender: "warn",
			maxLevel: "MARK",
		},
	},
	categories: {
		"default": {
			appenders: ["consoleLog", "traceLog", "warnLog"],
			level: "ALL",
			enableCallStack: true,
		},
	},
	pm2: false,
	pm2InstanceVar: undefined,
	disableClustering: false,
});
export const logger = getLogger("default");

export function getLogger(name?: string) {
	return getter(name + "\t");
}

export class Logable {
	private static readonly _logger: Logger = logger;

	public static new<T, P extends any[]>(this: new(...arg: P) => T, ...arg: P): T {
		return new this(...arg);
	}

	public static hrtime(time: [number, number], msg: string = "本次请求"): void {
		let [s, ns] = process.hrtime(time);
		ns /= 1e3;
		if (ns < 1e3) {
			return this.logger.info(`耗时 ${s} 秒 ${ns} 微秒:\t${msg}`);
		}
		ns = (ns | 0) / 1e3;
		return this.logger.info(`耗时 ${s} 秒 ${ns} 毫秒:\t${msg}`);
	}

	public static get logger(): Logger {
		function LoggerGetter(this: typeof Logable): Logger {
			return this._logger;
		}

		if (this !== Logable) {
			Reflect.defineProperty(this, "_logger", <TypedPropertyDescriptor<Logger>>{
				configurable: true,
				enumerable: false,
				value: getLogger(this.name),
			});
			Reflect.defineProperty(this, "logger", <TypedPropertyDescriptor<Logger>>{
				configurable: true,
				enumerable: false,
				get: LoggerGetter,
				set: undefined,
			});
		}
		return this._logger;
	}

	public get logger(): Logger {
		// @ts-ignore
		return this.constructor.logger;
	}

	private get [Symbol.toStringTag]() {
		return this.constructor.name;
	}
}
