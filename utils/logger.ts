import {
	BaseLayout, ColoredLayout, Configuration, configure, ConsoleAppender, DateFileAppender, getLogger, Logger,
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
		"trace": <DateFileAppender>{
			type: "dateFile",
			filename: "./logs/date.log",
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
		"warn": <SyncfileAppender>{
			type: "fileSync",
			filename: "./logs/Warn.log",
			backups: 5,
			maxLogSize: 1024 * 1024,
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
export const logger = getLogger();

export class Logable {
	private static _logger: Logger = logger;

	public static get logger(): Logger {
		if (!Object.getOwnPropertyNames(this).includes("_logger")) {
			this._logger = getLogger(this.name);
		}
		return this._logger;
	}

	public get logger(): Logger {
		// @ts-ignore
		return this.constructor.logger;
	}
}
