import crypto from 'crypto';

import { HTTP } from 'meteor/http';

const CRED_SERVICE_URL = process.env.CRED_SERVICE_URL || 'http://credential-manager-svc:18801';

export class WechatCredManager {
	static _request(pathname, query = {}) {
		const url = new URL(pathname, CRED_SERVICE_URL);
		Object.keys(query).forEach((key) => {
			url.searchParams.set(key, query[key]);
		});
		const response = HTTP.get(url.toString());
		return JSON.parse(response.content);
	}

	static paiyaMiniKey() {
		return this._request('/api/v1/key', { name: 'wechat-mini' });
	}

	static paiyaMiniAccessToken() {
		const result = this._request('/api/v1/wechat/mini');
		return result.value;
	}
}

export const decodeAES = (algorithm, sessionKey, iv, encryptedData) => {
	const cipherChunks = [];
	const decipher = crypto.createDecipheriv(
		algorithm,
		Buffer.from(sessionKey, 'base64'),
		Buffer.from(iv, 'base64'),
	);
	decipher.setAutoPadding(true);
	cipherChunks.push(decipher.update(encryptedData, 'base64', 'utf8'));
	cipherChunks.push(decipher.final('utf8'));
	return cipherChunks.join('');
};

export const decodeAES128CBC = (sessionKey, iv, encryptedData) => decodeAES('aes-128-cbc', sessionKey, iv, encryptedData);
export const decodeAES192CBC = (sessionKey, iv, encryptedData) => decodeAES('aes-192-cbc', sessionKey, iv, encryptedData);
export const decodeAES256CBC = (sessionKey, iv, encryptedData) => decodeAES('aes-256-cbc', sessionKey, iv, encryptedData);

const httpGet = (url, options) => {
	const response = HTTP.get(url, { ...options });
	if (response.statusCode !== 200 || !response.content) {
		return {};
	}

	return JSON.parse(response.content);
};

const httpPost = (url, options) => {
	if (!options.headers) {
		options.headers = {
			'Content-Type': 'application/json',
		};
	}
	const response = HTTP.post(url, { ...options });

	if (response.statusCode !== 200 || !response.content) {
		return {};
	}

	return JSON.parse(response.content);
};

export class WechatAPI {
	static snsJscode2session(code) {
		const { appId, appSecret } = WechatCredManager.paiyaMiniKey();
		const response = httpGet('https://api.weixin.qq.com/sns/jscode2session', {
			params: {
				appid: appId,
				secret: appSecret,
				js_code: code,
				grant_type: 'authorization_code',
			},
		});

		return response;
	}

	static wxaBusinessGetuserphonenumber(code) {
		const response = httpPost('https://api.weixin.qq.com/wxa/business/getuserphonenumber', {
			params: {
				access_token: WechatCredManager.paiyaMiniAccessToken(),
			},
			data: {
				code,
			},
		});

		return response;
	}
}
