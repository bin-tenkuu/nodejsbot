export function dice(times: number, max: number): { num: number, list: number[] } {
  if (times > 100 || max > 1e+10) {
    return {num: 0, list: []};
  }
  let r = 0;
  let arr: number[] = new Array(times);
  for (; times > 0;) {
    let random = Math.ceil(Math.random() * max);
    r += random;
    times--;
    arr[times] = random;
  }
  return {
    num: r,
    list: arr,
  };
}


