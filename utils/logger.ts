import {
	BaseLayout, Configuration, configure, ConsoleAppender, DateFileAppender, getLogger, MessagePassThroughLayout,
} from "log4js";

configure(<Configuration>{
	appenders: {
		consoleLog: <ConsoleAppender>{
			type: "console",
			layout: <MessagePassThroughLayout>{
				type: "messagePassThrough",
			},
		},
		infoLog: <DateFileAppender>{
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
			appenders: ["consoleLog", "infoLog"],
			level: "info",
			enableCallStack: true,
		},
	},
});
const logger = getLogger();

export {
	logger,
};
