# NodeJsBot

## 1. 背景

使用 `nodejs` 作为开发/运行环境, 一个支持热更新配置的 qq 机器人实现.

使用 `websocket` 连接 [`go-cqhttp`(点击前往)](https://github.com/Mrs4s/go-cqhttp) 开启的 qq 消息服务

## 2. 横幅

<details><summary>老DD了</summary>
<img src="logo.png" alt="咩真可爱" title="三字母人快爬啊啊啊啊啊" />
</details>
## 3. 使用

1. 在 `./config` 目录下新建 `config.json` 文件并写入以下内容:

```json
{
	"$schema": "schema/config.schema.json",
	"CQWS": {
		"accessToken": "",
		"baseUrl": "ws://xxx:6700"
	},
	"adminId": 0,
	"adminGroup": 0,
	"SauceNAOkey": "x",
	"SeTuApiKey": "x"
}
```

其中具体数据根据自身情况而定,

2. 大部分 bot 回复都可以在 `corpus.json` 中修改, 请自行修改
3. bot 使用 `sqlite` 数据库, 新建脚本在 `db.sql` 文件中, 请自行新建 `db.db` 文件
4. `npm install` , `tsc` , `npm start`
5. 如果想要打包:
    1. 运行 `npm pack`
    2. 将根目录中生成的 `nodejsbot-1.0.0.tgz` 文件上传至服务器解压
    3. 运行 `tar -zxvf nodejsbot-1.0.0.tgz` , `cd package` , `npm update` `npm start`

