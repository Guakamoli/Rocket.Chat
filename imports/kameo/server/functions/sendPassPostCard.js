import { httpPost } from '../utils';

const OOPS_SERVICE_URL = process.env.OOPS_SERVICE_URL || 'http://oops-feishu-bot-svc:8080';
const secret = process.env.INTERNAL_X_SECRET || '';

export const sendPassPostCard = (data) => {
	const headers = {
		'content-type': 'application/json',
		'x-secret': secret,
	};
	const url = new URL('/recommend/card', OOPS_SERVICE_URL);
	Promise.resolve().then(() => {
		httpPost(url.toString(), { headers, data });
	});
};
