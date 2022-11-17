import { promisify } from 'util';

import { createClient, RedisClient } from 'redis';

let client: RedisClient;

export function redisConnectWithRetry(url: string): RedisClient {
	console.log('Connecting to Redis...');

	client = createClient({ url });
	client.on('error', function(err) {
		console.log('Redis Client Error', err);
	});
	client.on('connect', function() {
		console.log('Connected to Redis');
	});
	return client;
}

interface IMethods {
	[key: string]: any;
}

export function redisClient(): IMethods | null {
	if (!process.env.REDIS_URL) {
		return null;
	}

	if (!client) {
		client = redisConnectWithRetry(process.env.REDIS_URL);
	}

	const methods: IMethods = {
		get: client.get,
		set: client.set,
		setex: client.setex,
		setnx: client.setnx,
		append: client.append,
		expire: client.expire,
		incr: client.incr,
		decr: client.decr,
	};

	for (const [method, redisMethod] of Object.entries(methods)) {
		methods[method] = promisify(redisMethod).bind(client);
	}

	return methods;
}
