import {BaseLayout, configure, ConsoleAppender, DateFileAppender, MessagePassThroughLayout} from "log4js";

export var logger = configure({
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

