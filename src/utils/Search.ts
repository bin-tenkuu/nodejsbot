import axios from "axios";
import {paulzzhTouHouType, sauceNAOResult} from "./SearchType";

const {SauceNAOkey} = require("../../config/config.json");
const axiosClient = axios.create({
  timeout: 20000,
});

export function sauceNAO(url: string, options = {}): Promise<sauceNAOResult> {
  return axiosClient.get("https://saucenao.com/search.php", {
    params: {
      api_key: SauceNAOkey,
      output_type: 2,
      url: url,
      testmode: 1,
    },
  }).then(value => value.data as sauceNAOResult);
}

export function ascii2d(url: string) {
  return axiosClient.post(`https://ascii2d.net/search/uri`, {
    uri: url,
  })
    .then(r => ({
      colorURL: r.request.res.responseUrl,
      colorDetail: r.data,
    }));
}


export function paulzzhTouHou() {
  return axiosClient.get("https://img.paulzzh.tech/touhou/random", {
    params: {
      type: "json",
    },
  }).then(r => r.data as paulzzhTouHouType);
}

export var get = axiosClient.get;
