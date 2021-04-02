import {configure} from "log4js";

export var logger = configure({
  appenders: {
    consoleLog: {
      type: "console",
    },
    fileLog: {
      type: "file",
      filename: "./logs/logs.log",
      backups: 3,
    },
  },
  categories: {
    default: {
      appenders: ["consoleLog", "fileLog"],
      level: "all",
    },
  },
}).getLogger();

