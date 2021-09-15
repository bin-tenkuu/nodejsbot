import {
	BaseLayout, Configuration, configure, ConsoleAppender, DateFileAppender, MessagePassThroughLayout,
} from "log4js";

export const logger = configure(<Configuration>{
	appenders: {
		consoleLog: <ConsoleAppender>{
			type: "console",
			layout: <MessagePassThroughLayout>{
				type: "messagePassThrough",
			},
		},
		dataLog: <DateFileAppender>{
			type: "dateFile",
			filename: "./logs/date.log",
			pattern: "yyyy-MM-dd",
			alwaysIncludePattern: true,
			daysToKeep: 10,
			keepFileExt: true,
			layout: <BaseLayout>{
				type: "basic",
			},
		},
	},
	categories: {
		"default": {
			appenders: ["consoleLog", "dataLog"],
			level: "all",
			enableCallStack: true,
		},
	},
}).getLogger("default");

export function hrtime(time: [number, number]): void {
	let [s, ns] = process.hrtime(time);
	ns = ns / 1e3;
	if (ns < 1000) {
		return logger.info(`本次请求耗时:${s}秒${ns}微秒`);
	}
	ns = (ns | 0) / 1e3;
	return logger.info(`本次请求耗时:${s}秒${ns}毫秒`);
}

