import {createWriteStream, readFileSync} from "fs";

const s = readFileSync("D:\\Download\\access81.log").toString();
const stream = createWriteStream("./logs/accessFormat.ini", "utf-8");
const map = new Map<string, string[]>();
{
	const split = s.split("\n");
	console.log(split.length);
	split.forEach(str => {
		const number = str.indexOf(" ");
		const ip = str.substring(0, number);
		const text = str.substring(number + 1);
		const strings = map.get(ip);
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
		texts.forEach((text, i) => {
			write(`${i}=${text}\n`);
		});
		write("\n");
	}
}
stream.close();
console.log("完成");
