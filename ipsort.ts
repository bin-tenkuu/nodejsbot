import {readFileSync, createWriteStream} from "fs";

let s = readFileSync("D:\\Download\\accessASF.log").toString();
const stream = createWriteStream("D:\\Download\\accessFormat.ini", "utf-8");
let map = new Map<string, string[]>();
{
	let split = s.split("\n");
	console.log(split.length);
	split.forEach(str => {
		let number = str.indexOf(" ");
		let ip = str.substring(0, number);
		let text = str.substring(number);
		let strings = map.get(ip);
		if (strings === undefined) {
			map.set(ip, [text]);
		} else {
			strings.push(text);
		}
	});
}
{
	function write(text: string): void {
		if (stream.write(text)) {
			stream.emit("drain");
		}
	}

	for (const [ip, texts] of map) {
		write(`[${ip}]\n`);
		for (const text of texts) {
			write(`${text}\n`);
		}
		write("\n");
	}
}
stream.close();
console.log("完成");
