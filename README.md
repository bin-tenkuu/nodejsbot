# NodeJsBot

## 1. 背景

使用 `nodejs` 作为开发/运行环境,一个支持热更新,热重载的qq机器人实现.

使用 `正向websocket` 连接 [`go-cqhttp`(点击前往)](https://github.com/Mrs4s/go-cqhttp) 开启的qq消息服务

目标是频繁更新功能均使用插件实现.让其支持热更新与热重载

## 2. 横幅

<details><summary>老DD了</summary>

![老DD了](./400x400.png)

</details>

## 3. 目录

- [背景](#1-)
- [横幅](#2-)
- [目录](#3-)
- [安装](#4-)
- [API](#5-api)
- [注](#6-)

## 4. 安装

本项目使用的 [`go-cqhttp`(点击前往)](https://github.com/Mrs4s/go-cqhttp) 项目请自行下载并配置运行

1. 首先安装 [`nodejs`(点击前往)](http://nodejs.cn/download/) 运行环境
2. 克隆本项目
3. 进入项目目录,执行 `npm i` 下载依赖
4. 在项目目录中新建文件夹 `config`
5. 在 `config` 文件夹中新建文件 `config.json` 并写入如下配置

   **注1**: 写入文件时请删除注释,防止出错

   **注2**: 本配置文件为插件 `bot.js` 中需求,建议自行修改后硬编码进js文件

    ```json5
    {
      // cqws 部分参数具体参考 node库: 
      // 'cq-websocket' 中 'CQWebSocketOption'
      "cqws": {
        "accessToken": "",
        "enableAPI": true,
        "enableEvent": true,
        "protocol": "ws:",
        "host": "",
        "port": 0,
        // baseUrl 参数与 (host / port) 参数中二选一
        "baseUrl": "",
        "qq": 0,
        "reconnection": true,
        "reconnectionAttempts": 10,
        "reconnectionDelay": 5000
      },
      // adminID 为管理员QQ号码,
      "adminId": 0
    }
    ```

6. 回到项目根目录,执行 `npm run run`
7. bot启用

## 5. API

参考项目根目录中 [`Plugin.js`(点击查看)](./Plugin.js) 文件,所有插件均继承自本类

插件加载器: [`PluginLoader.js`(点击查看)](./PluginLoader.js) 所有插件均被此插件加载器加载,均加载自 `./plugin/` 目录下

简易插件写法: [`test.js`(点击查看)](./plugin/test.js)

## 6. 注

1. 由于 `node --inspect` 不支持模块化调试,故本项目自己实现了一个简易模块
2. 所有调试与测试在 `node --inspect` 环境中进行,不给出具体测试文件, `test.js` 文件仅用于语法提示