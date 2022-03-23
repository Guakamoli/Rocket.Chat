import { httpGet, httpPost } from './index';

const CRED_SERVICE_URL = process.env.CRED_SERVICE_URL || 'http://credential-manager-svc:18801';

export class WechatCredManager {
	static _request(pathname, query = {}) {
		const url = new URL(pathname, CRED_SERVICE_URL);
		Object.keys(query).forEach((key) => {
			url.searchParams.set(key, query[key]);
		});
		return httpGet(url.toString());
	}

	static paiyaMiniKey() {
		return this._request('/api/v1/key', { name: 'wechat-mini' });
	}

	static paiyaMiniAccessToken() {
		const result = this._request('/api/v1/wechat/mini');
		return result.value;
	}
}

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
