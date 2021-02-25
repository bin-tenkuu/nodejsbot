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
export type loliconDate = {
  /**返回码，可能值详见后续部分*/
  code: number
  /**错误信息之类的*/
  msg: string
  /**剩余调用额度*/
  quota: number
  /**距离下一次调用额度恢复(+1)的秒数*/
  quota_min_ttl: number
  /**结果数*/
  count: number
  /**色图数组*/
  data: setu[]
}
type setu = {
  /**作品 PID*/
  pid: number
  /**作品所在 P*/
  p: number
  /**作者 UID*/
  uid: number
  /**作品标题*/
  title: string
  /**作者名（入库时，并过滤掉 @ 及其后内容）*/
  author: string
  /**图片链接（可能存在有些作品因修改或删除而导致 404 的情况）*/
  url: string
  /**是否 R18（在色图库中的分类，并非作者标识的 R18）*/
  r18: boolean
  /**原图宽度 px*/
  width: number
  /**原图高度 px*/
  height: number
  /**作品标签，包含标签的中文翻译（有的话）*/
  tags: string[]
}

interface Prom<T, U> extends PromiseLike<T> {
  then<TR1 = T, TR2 = U>(onfulfilled?: ((value: T) => TR1 | PromiseLike<TR1>),
                         onrejected?: ((reason: U) => TR2 | PromiseLike<TR2>),
  ): Promise<TR1 | TR2>;
  
  catch<TR = U>(onrejected?: ((reason: U) => TR | PromiseLike<TR>)): Promise<T | TR>;
}