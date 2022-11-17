import { settings } from '../../../../app/settings';
import { redisClient } from '../utils/redis';

function fetchRatelimitOptions(prefix) {
	const t = prefix.replace(/^\S/, (s) => s.toUpperCase());
	return {
		limit: settings.get(`Send_Message_Ratelimit_${ t }_Per_Limit`) || 1,
		expire: settings.get(`Send_Message_Ratelimit_${ t }_Key_Expire`) || 1,
	};
}

export async function isOverLimit(userId, prefix) {
	if (redisClient() === null) {
		return false;
	}

	if (!['post', 'discussion', 'direct'].includes(prefix)) {
		return false;
	}

	const ratelimitOptions = fetchRatelimitOptions(prefix);
	const ratelimitKey = `ratelimit/${ prefix }/${ userId }`;

	let res;
	try {
		res = await redisClient().incr(ratelimitKey); // 累加请求数
	} catch (err) {
		console.error('isOverLimit: could not increment key', err);
		throw err;
	}

	console.log(`isOverLimit: prefix=${ prefix } userId=${ userId } value=${ res }`);
	if (res > ratelimitOptions.limit) {
		return true;
	}

	await redisClient().expire(ratelimitKey, ratelimitOptions.expire);
	return false;
}
