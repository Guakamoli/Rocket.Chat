import crypto from 'crypto';

import { HTTP } from 'meteor/http';

import NotificationClass from './NotificationClass';

const { PRODUCT_CODE } = process.env;
const currentProduct = (data) => data[PRODUCT_CODE];

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

export const httpGet = (url, options) => {
	const response = HTTP.get(url, { ...options });
	if (response.statusCode !== 200 || !response.content) {
		return {};
	}

	return JSON.parse(response.content);
};

export const httpPost = (url, options) => {
	options.headers = {
		'content-type': 'application/json',
		...options.headers,
	};

	const response = HTTP.post(url, { ...options });

	if (response.statusCode !== 200 || !response.content) {
		return {};
	}

	return JSON.parse(response.content);
};

export function checkInviteCodeAvailability(code) {
	const baseURL = process.env.DATA_SERVICE_URL || 'http://data-backend-svc:8080';
	const url = new URL(`/api/v1/invite/code/${ code }`, baseURL);
	const xSecret = process.env.INTERNAL_X_SECRET || '';
	const result = httpGet(url.toString(), { headers: { 'x-secret': xSecret } });
	const { data, error } = result;
	if (!result || error || !data?.code) {
		return false;
	}
	return true;
}

/**
 * 安全的XML字符转义
 * @param str {string}
 * @return {string}
 */
export function safeXML(str) {
	return str.replace(/\</g, '&lt;')
		.replace(/\&/g, '&amp;');
}

export {
	PRODUCT_CODE,
	currentProduct,
	NotificationClass,
};
