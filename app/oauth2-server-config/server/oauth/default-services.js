import { OAuthApps } from '../../../models';

// if (!OAuthApps.findOne('zapier')) {
// 	OAuthApps.insert({
// 		_id: 'zapier',
// 		name: 'Zapier',
// 		active: true,
// 		clientId: 'zapier',
// 		clientSecret: 'RTK6TlndaCIolhQhZ7_KHIGOKj41RnlaOq_o-7JKwLr',
// 		redirectUri: 'https://zapier.com/dashboard/auth/oauth/return/RocketChatDevAPI/',
// 		_createdAt: new Date(),
// 		_createdBy: {
// 			_id: 'system',
// 			username: 'system',
// 		},
// 	});
// }

if (!OAuthApps.findOne('kameo-admin')) {
	OAuthApps.insert({
		_id: 'kameo-admin',
		name: 'kameo-admin',
		active: true,
		clientId: process.env.KAMEO_ADMIN_OAUTH_CLIENT_ID,
		clientSecret: process.env.KAMEO_ADMIN_OAUTH_CLIENT_SECRET,
		redirectUri: `${ process.env.KAMEO_ADMIN_URL }/oauth/callback`,
		_createdAt: new Date(),
		_createdBy: {
			_id: 'system',
			username: 'system',
		},
	});
}

if (!OAuthApps.findOne('kameo-front')) {
	OAuthApps.insert({
		_id: 'kameo-front',
		name: 'kameo-front',
		active: true,
		clientId: process.env.KAMEO_FRONT_OAUTH_CLIENT_ID,
		clientSecret: process.env.KAMEO_FRONT_OAUTH_CLIENT_SECRET,
		redirectUri: `${ process.env.KAMEO_FRONT_URL }/callback`,
		_createdAt: new Date(),
		_createdBy: {
			_id: 'system',
			username: 'system',
		},
	});
}
