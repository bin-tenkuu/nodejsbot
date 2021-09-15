export function dice(times: number, max: number): { num: number, list: Uint16Array } {
	if (times > 99) {
		return {num: 0, list: Uint16Array.of()};
	}
	if (max > 9999999999) {
		max = 99_9999_9999;
	}
	let r = 0;
	let arr = new Uint16Array(times);
	while (--times >= 0) {
		arr[times] = Math.random() * max + 1;
		r += arr[times];
	}
	return {
		num: r,
		list: arr,
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

