import crypto from 'crypto';

import { uuidv4 } from './random';
import { fetch } from './fetch';

export type GreenOptions = {
	accessKeyId: string;
	accessKeySecret: string;
	regionId: GreenRegion;
};

export type GreenRegion = 'cn-shanghai' | 'ap-southeast-1';

export type GreenPornScanScenes =
  | 'porn'
  | 'terrorism'
  | 'ad'
  | 'live'
  | 'qrcode'
  | 'logo';

export class Green {
	Version = '2017-01-12';

	ClientInfo = { ip: '127.0.0.1' };

	#accessKeyId: string;

	#accessKeySecret: string;

	#regionId: string;

	constructor(options: GreenOptions) {
		const { accessKeyId, accessKeySecret, regionId } = options;
		this.#accessKeyId = accessKeyId;
		this.#accessKeySecret = accessKeySecret;
		this.#regionId = regionId;
	}

	async textScan(texts: string[], scenes = ['antispam']): Promise<any> {
		const bizConfig = {
			path: '/green/text/scan',
			requestBody: {
				scenes,
				tasks: texts.map((t) => ({
					dataId: uuidv4(),
					content: t,
				})),
			},
		};
		return this._request(bizConfig);
	}

	async pornScan(imageUrls: string[], scenes: GreenPornScanScenes[] = ['porn']): Promise<any> {
		const bizConfig = {
			path: '/green/image/scan',
			requestBody: {
				scenes,
				tasks: imageUrls.map((url) => ({
					dataId: uuidv4(),
					url,
				})),
			},
		};
		return this._request(bizConfig);
	}

	async _request(bizConfig: any): Promise<any> {
		const { path, requestBody } = bizConfig;
		const gmtCreate = new Date().toUTCString();
		const md5 = crypto.createHash('md5');
		const body = JSON.stringify({
			bizType: 'default',
			...requestBody,
		});
		const requestHeaders = {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'Content-MD5': md5.update(body).digest().toString('base64'),
			Date: gmtCreate,
			'x-acs-version': this.Version,
			'x-acs-signature-nonce': uuidv4(),
			'x-acs-signature-version': '1.0',
			'x-acs-signature-method': 'HMAC-SHA1',
		};
		this._sign(requestHeaders, bizConfig);
		const uri = new URL(`https://green.${ this.#regionId }.aliyuncs.com`);
		uri.pathname = path;
		uri.searchParams.set('clientInfo', JSON.stringify(this.ClientInfo));
		return fetch(uri.toString(), {
			method: 'POST',
			headers: requestHeaders,
			body,
		});
	}

	_sign(requestHeaders: any, bizConfig: any): void {
		const { path } = bizConfig;
		const authorization = crypto
			.createHmac('sha1', this.#accessKeySecret)
			.update(
				`POST
application/json
${ requestHeaders['Content-MD5'] }
application/json
${ requestHeaders.Date }
x-acs-signature-method:HMAC-SHA1
x-acs-signature-nonce:${ requestHeaders['x-acs-signature-nonce'] }
x-acs-signature-version:1.0
x-acs-version:2017-01-12
${ path }?clientInfo=${ JSON.stringify(this.ClientInfo) }`,
			)
			.digest()
			.toString('base64');
		requestHeaders.Authorization = `acs ${ this.#accessKeyId }:${ authorization }`;
	}
}
