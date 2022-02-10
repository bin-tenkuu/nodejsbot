# NodeJsBot

2022/2/10: 作者转到 `mirai` 去用 koltin 写 bot 了，所以这个 bot 就暂时不更新了（kotlin 真香）

## 1. 背景

使用 `nodejs` 作为开发/运行环境, 一个完全手动 qq 机器人实现.

使用 `websocket` 连接 [`go-cqhttp`(点击前往)](https://github.com/Mrs4s/go-cqhttp) 开启的 qq 消息服务

## 2. 横幅

<details><summary>老DD了</summary>
<img src="logo.png" alt="咩真可爱" title="三字母人快爬啊啊啊啊啊" />
</details>

## 3. 使用

1. 在 `./config` 目录下新建 `config.json` 文件并写入 文件 `config.default.json` 的内容, 其中具体数据根据自身情况而定,
2. 全部 bot 功能都使用 `@canCall` 注解配置, 请自行理解
3. bot 使用 `sqlite` 数据库, 新建脚本在 `db.sql` 文件中, 请自行新建 `db.db` 文件
4. `npm install` , `tsc` , `npm start`
5. 如果想要打包:
	1. 运行 `npm pack`
	2. 将根目录中生成的 `nodejsbot-1.0.0.tgz` 文件上传至服务器解压
	3. 运行 `tar -zxvf nodejsbot-1.0.0.tgz` , `cd package` , `npm update` `npm start`

