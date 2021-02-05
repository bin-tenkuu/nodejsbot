type sauceNAOResultsHeader = {
  /** 库id */
  index_id: number,
  /** 库名字 */
  index_name: string
  /** 相似度 */
  similarity: number,
  /** 缩略图url */
  thumbnail: string
};
export type sauceNAOResult = {
  header: {
    /** 长时限制 */
    long_limit: string,
    /**长时剩余*/
    long_remaining: number,
    /** 短时限制 */
    short_limit: string,
    /**短时剩余*/
    short_remaining: number,
    /** 请求的结果数 */
    results_requested: string,
    /**返回的结果数*/
    results_returned: number
  },
  results: {
    header: sauceNAOResultsHeader,
    data: unknown
  }[]
}
export type paulzzhTouHouType = {
  author: string
  height: number
  id: number
  jpegurl: string
  md5: string
  preview: string
  size: number
  source: string
  tags: string
  timestamp: number
  url: string
  width: number
}