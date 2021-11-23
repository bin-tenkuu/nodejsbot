import {
	BaseLayout, ColoredLayout, Configuration, configure, ConsoleAppender, DateFileAppender, getLogger as getter, Logger,
	LogLevelFilterAppender,
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
		"trace": <DateFileAppender>{
			type: "dateFile",
			filename: "./logs/Trace.log",
			pattern: "yyyy-MM-dd",
			encoding: "utf-8",
			compress: false,
			alwaysIncludePattern: true,
			daysToKeep: 5,
			keepFileExt: true,
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
const loggerMap: Map<string, Logger> = new Map<string, Logger>();
export function getLogger(name: string = "default") {
	let logger: Logger | undefined = loggerMap.get(name);
	if (logger == null) {
		logger = getter(name + "\t");
		loggerMap.set(name, logger);
	}
	return logger;
}

function defineLogger(target: Function): Logger {
	const logger: Logger = getLogger(target.name);
	Reflect.defineProperty(target, "logger", <PropertyDescriptor>{
		writable: false,
		enumerable: false,
		configurable: true,
		value: logger,
	});
	Reflect.defineProperty(target.prototype, "logger", <PropertyDescriptor>{
		writable: false,
		enumerable: false,
		configurable: true,
		value: logger,
	});
	return logger;
}

export class Logable {
	public static hrtime(time: [number, number], msg: string = "本次请求"): string {
		let [s, ns] = process.hrtime(time);
		ns /= 1e3;
		if (ns < 1e3) {
			return `耗时 ${s} 秒 ${ns} 微秒:\t${msg}`;
		}
		ns = (ns | 0) / 1e3;
		return `耗时 ${s} 秒 ${ns} 毫秒:\t${msg}`;
	}

	public static get logger(): Logger {
		return defineLogger(this);
	}

	public get logger(): Logger {
		return defineLogger(this.constructor);
	}
}
