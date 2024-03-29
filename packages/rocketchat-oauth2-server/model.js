/* eslint-disable no-undef */
// Generated by CoffeeScript 2.6.0
let AccessTokens;
let RefreshTokens;
let Clients;
let AuthCodes;
let debug;

class Model {
	constructor(config = {}) {
		if (config.accessTokensCollectionName == null) {
			config.accessTokensCollectionName = 'oauth_access_tokens';
		}
		if (config.refreshTokensCollectionName == null) {
			config.refreshTokensCollectionName = 'oauth_refresh_tokens';
		}
		if (config.clientsCollectionName == null) {
			config.clientsCollectionName = 'oauth_clients';
		}
		if (config.authCodesCollectionName == null) {
			config.authCodesCollectionName = 'oauth_auth_codes';
		}

		// eslint-disable-next-line no-multi-assign
		this.debug = debug = config.debug;

		// eslint-disable-next-line no-multi-assign
		this.AccessTokens = AccessTokens = config.accessTokensCollection || new Meteor.Collection(config.accessTokensCollectionName);
		// eslint-disable-next-line no-multi-assign
		this.RefreshTokens = RefreshTokens = config.refreshTokensCollection || new Meteor.Collection(config.refreshTokensCollectionName);
		// eslint-disable-next-line no-multi-assign
		this.Clients = Clients = config.clientsCollection || new Meteor.Collection(config.clientsCollectionName);
		// eslint-disable-next-line no-multi-assign
		this.AuthCodes = AuthCodes = config.authCodesCollection || new Meteor.Collection(config.authCodesCollectionName);
	}

	grantTypeAllowed(clientId, grantType, callback) {
		if (debug === true) {
			console.log('[OAuth2Server]', 'in grantTypeAllowed (clientId:', clientId, ', grantType:', `${ grantType })`);
		}
		callback(false, grantType === 'authorization_code' || grantType === 'refresh_token');
	}
}

Model.prototype.getAccessToken = Meteor.bindEnvironment(function(bearerToken, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', 'in getAccessToken (bearerToken:', bearerToken, ')');
	}

	try {
		const token = AccessTokens.findOne({
			accessToken: bearerToken,
		});
		callback(null, token);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.getClient = Meteor.bindEnvironment(function(clientId, clientSecret, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', 'in getClient (clientId:', clientId, ', clientSecret:', clientSecret, ')');
	}

	try {
		let client;

		if (clientSecret == null) {
			client = Clients.findOne({
				active: true,
				clientId,
			});
		} else {
			client = Clients.findOne({
				active: true,
				clientId,
				clientSecret,
			});
		}

		callback(null, client);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.saveAccessToken = Meteor.bindEnvironment(function(token, clientId, expires, user, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', 'in saveAccessToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')');
	}

	try {
		const tokenId = AccessTokens.insert({
			accessToken: token,
			clientId,
			userId: user.id,
			expires,
		});
		callback(null, tokenId);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.getAuthCode = Meteor.bindEnvironment(function(authCode, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', `in getAuthCode (authCode: ${ authCode })`);
	}

	try {
		const code = AuthCodes.findOne({
			authCode,
		});
		callback(null, code);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.saveAuthCode = Meteor.bindEnvironment(function(code, clientId, expires, user, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', 'in saveAuthCode (code:', code, ', clientId:', clientId, ', expires:', expires, ', user:', user, ')');
	}

	try {
		const codeId = AuthCodes.upsert({
			authCode: code,
		}, {
			authCode: code,
			clientId,
			userId: user.id,
			expires,
		});
		callback(null, codeId);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.saveRefreshToken = Meteor.bindEnvironment(function(token, clientId, expires, user, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', 'in saveRefreshToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')');
	}

	try {
		const tokenId = RefreshTokens.insert({
			refreshToken: token,
			clientId,
			userId: user.id,
			expires,
		});
		callback(null, tokenId);
	} catch (err) {
		callback(err);
	}
});

Model.prototype.getRefreshToken = Meteor.bindEnvironment(function(refreshToken, callback) {
	if (debug === true) {
		console.log('[OAuth2Server]', `in getRefreshToken (refreshToken: ${ refreshToken })`);
	}

	try {
		const token = RefreshTokens.findOne({
			refreshToken,
		});
		callback(null, token);
	} catch (err) {
		callback(err);
	}
});

export {
	Model,
};
