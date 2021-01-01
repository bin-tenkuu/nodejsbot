const SauceNAO = require("saucenao");

const my = new SauceNAO("0330f998e5e2a7cdea344d655dbdc72b6058a5a9");

class SauceNAOResult {
  constructor({
    header: {
      long_limit,
      long_remaining, // 长时剩余
      short_limit,
      short_remaining,// 短时剩余
      results_requested,
      results_returned// 结果数
    },
    results
  }) {
    /**
     * 长时限制
     * @type {string}
     */
    this.long_limit = long_limit;
    /**
     * 长时剩余
     * @type {number}
     */
    this.long_remaining = long_remaining
    /**
     * 短时限制
     * @type {string}
     */
    this.short_limit = short_limit
    /**
     * 短时剩余
     * @type {number}
     */
    this.short_remaining = short_remaining
    /**
     * 请求的结果数
     * @type {string}
     */
    this.results_requested = results_requested
    /**
     * 返回的结果数
     * @type {number}
     */
    this.results_returned = results_returned
    /**
     * 结果
     * @type {Result[]}
     */
    this.results = results.map(j => new Result(j));
  }

  get hasResult() {
    return this.results_returned > 0 || this.results.length > 0
  }
}

class Result {
  constructor({
    header: {
      index_id,   // 库id
      similarity, // 相似度
      thumbnail   // 缩略图
    },
    data
  }) {

    /**
     * 库id
     * @type {number}
     */
    this.index_id = index_id;
    /**
     * 相似度
     * @type {number}
     */
    this.similarity = similarity;
    /**
     * 缩略图url
     * @type {string}
     */
    this.thumbnail = thumbnail;
    /**
     * 对应库数据
     */
    this.data = data;
  }
}

/**
 *
 * @param {string|Buffer|Readable}input
 * @param options
 * @return {PromiseLike<SauceNAOResult> | Promise<SauceNAOResult>}
 */
function search(input, options) {
  return my(input, options).then(res => {
    return new SauceNAOResult(res.json);
  })
}

module.exports = {
  search,
  SauceNAOResult,
  Result
}