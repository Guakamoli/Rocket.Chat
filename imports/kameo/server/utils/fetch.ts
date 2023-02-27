import _fetch, { RequestInit } from 'node-fetch';

import { IFetchOptions } from '../definition';

export async function fetch(url: string): Promise<any>;
export async function fetch(
	url: string,
	init: RequestInit & IFetchOptions,
): Promise<any>;
export async function fetch(url: string, init?: RequestInit & IFetchOptions): Promise<any> {
	const {
		method = 'GET',
		body,
		headers = {},
		output = 'json',
		interceptor = true,
		timeout,
	} = init || {};

	const response = await _fetch(url, {
		method,
		headers: {
			'content-type': 'application/json',
			...headers,
		},
		body,
		...timeout && { timeout },
	});

	if (!response.ok && interceptor) {
		throw new Error(`HTTP Request faild status: ${ response.status }`);
	}

	if (output === 'raw') {
		return response;
	}

	if (output !== 'json') {
		return response.text();
	}
	return response.json();
}
