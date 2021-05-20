export function dice(times: number, max: number): { num: number, list: Uint16Array } {
  if (times > 99) {
    return {num: 0, list: Uint16Array.of()};
  }
  if (max > 65535) max = 65535;
  let r = 0;
  let arr = new Uint16Array(times);
  while (times > 0) {
    times--;
    arr[times] = Math.random() * max + 1;
    r += arr[times];
  }
  return {
    num: r,
    list: arr,
  };
}


