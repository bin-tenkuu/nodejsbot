import axios_1 from "axios";
import {SauceNAOkey, SeTuApiKey} from "../configs/config";
import {loliconDate, paulzzhTouHouType, sauceNAOResult, toubiecType} from "./SearchType";

export const axios = axios_1.create({
  timeout: 20000,
});

/**
 * NAO搜图
 * @param url
 */
export function sauceNAO(url: string): Promise<sauceNAOResult> {
  return axios.get("https://saucenao.com/search.php", {
    params: {
      api_key: SauceNAOkey,
      output_type: 2,
      url: url,
      testmode: 1,
    },
  }).then(value => value.data as sauceNAOResult);
}

/**TODO
 * ascii2d搜图
 * @param url
 */
export function ascii2d(url: string) {
  return axios.post(`https://ascii2d.net/search/uri`, {
    uri: url,
  })
      .then(r => ({
        colorURL: r.request.res.responseUrl,
        colorDetail: r.data,
      }));
}

/**
 * paulzzh的东方图API
 */
export function paulzzhTouHou(): Promise<paulzzhTouHouType> {
  return axios.get("https://img.paulzzh.tech/touhou/random", {
    params: {
      type: "json",
    },
  }).then(r => r.data as paulzzhTouHouType);
}

/**
 * lolicon API
 */
export function lolicon(keyword?: string, r18 = false): Promise<loliconDate> {
  // zhuzhu.php 朱朱搜图害我
  return axios.get("https://api.lolicon.app/setu/", {
    params: {
      apikey: SeTuApiKey,
      r18: r18,
      keyword: keyword,
      num: 1,
      size1200: true,
    },
  }).then<loliconDate>(r => r.data);
}

export function toubiec(): Promise<toubiecType> {
  return axios.get(`https://acg.toubiec.cn/random.php?ret=json`);
}

/**
 * p站图片链接
 * @param pid
 */
export function pixivProxy(pid: string): Promise<string> {
  return axios.get(`https://pixiv.cat/${pid}.png`).then(value => {
    return (value.headers["x-origin-url"]).replace("i.pximg.net", "i.pixiv.cat");
  }).catch(reason => {
    return Promise.reject(reason.response.data);
  });
}

