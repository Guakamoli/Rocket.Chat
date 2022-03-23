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

export {
	PRODUCT_CODE,
	currentProduct,
	NotificationClass,
};
