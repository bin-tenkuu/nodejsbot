import {randomInt} from "crypto";

export type DiceResult = { num: number, list: Uint32Array, max: number };

export function dice(times: number, max: number): DiceResult {
	times |= 0;
	if (times > 99 || times < 1) {
		return {num: 0, list: Uint32Array.of(), max: 0};
	}
	max = Math.trunc(max + 1);
	if (max > 1e10) {
		max = 1e10;
	} else if (max < 2) {
		max = 2;
	}
	let r = 0;
	const arr = new Uint32Array(times);
	while (--times >= 0) {
		r += arr[times] = randomInt(1, max) | 0;
	}
	return {
		num: r,
		list: arr,
		max: max - 1,
	};
}

/**
 * 返回区间[-1,1]的伪正态随机数
 * @param times 随机数叠加次数
 */
export function distribution(times = 12) {
	if (times <= 0) {
		return 0;
	}
	let sum = 0;
	for (let t = times; t > 0; t--) {
		sum += Math.random();
	}
	return (sum / times - 0.5) * 2;
}

