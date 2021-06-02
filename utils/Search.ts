import _axios from "axios";
import {SauceNAOkey, SeTuApiKey} from "../config/config.json";
import {loliconDate, paulzzhTouHouType, pixivCatType, sauceNAOResult, toubiecType} from "./SearchType";

export const axios = _axios.create({
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
  }).then<sauceNAOResult>((r) => r.data);
}

/**TODO
 * ascii2d搜图
 * @param url
 */
export function ascii2d(url: string) {
  return axios.post(`https://ascii2d.net/search/uri`, {
    uri: url,
  }).then(r => ({
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
  }).then<paulzzhTouHouType>((r) => r.data);
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
  }).then<loliconDate>((r) => r.data);
}

export function toubiec(): Promise<toubiecType> {
  return axios.get(`https://acg.toubiec.cn/random.php?ret=json`,
  ).then<toubiecType>((r) => r.data[0]);
}

/**
 * p站图片链接
 * @param pid
 */
export function pixivCat(pid: string): Promise<pixivCatType> {
  return axios.post("https://api.pixiv.cat/v1/generate", {
    p: pid,
  }).then<pixivCatType>((r) => r.data);
}


