import {BaseLayout, configure, ConsoleAppender, DateFileAppender, MessagePassThroughLayout} from "log4js";

export const logger = configure({
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

export function hrtime(time: [number, number]): void {
  let hrtime = process.hrtime(time)[1] | 0;
  let sec = "纳秒";
  if (hrtime < 1000) return logger.info("本次请求耗时:" + hrtime + sec);
  hrtime = hrtime / 1000 | 0;
  sec = "毫秒";
  if (hrtime < 1000) return logger.info("本次请求耗时:" + hrtime + sec);
  hrtime = hrtime / 1000 | 0;
  sec = "秒";
  return logger.info("本次请求耗时:" + hrtime + sec);
}

