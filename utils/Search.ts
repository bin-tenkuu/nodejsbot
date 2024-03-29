// noinspection JSUnusedGlobalSymbols

import _axios from "axios";
import {
	DMXKType, loliconDate, loliconPost, paulzzhTouHouType, pixivCatType, sauceNAOResult, toubiecType, YHType,
} from "./Models.js";

const {SauceNAOkey} = require("../config/config.json");

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
export function lolicon(data: loliconPost = {}): Promise<loliconDate> {
	return axios.post<loliconDate>("https://api.lolicon.app/setu/v2", <loliconPost>{
		...data,
		size: ["regular"],
		num: 1,
	}, {
		headers: {
			"Content-Type": "application/json",
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

/**动漫星空随机图片*/
export function dongManXingKong(): Promise<DMXKType> {
	return axios.get("https://api.dongmanxingkong.com/suijitupian/acg/1080p/index.php?return=json",
			{},
	).then<DMXKType>((data) => {
		return data.data;
	});
}

/**樱花随机二次元图片*/
export function yingHua(): Promise<YHType> {
	return axios.get("https://www.dmoe.cc/random.php?return=json",
			{},
	).then<YHType>((data) => {
		return data.data;
	});
}
