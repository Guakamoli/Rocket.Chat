/* eslint-disable no-undef */
Package.describe({
	name: 'rocketchat:oauth2-server',
	version: '3.0.0-develop',
	summary: 'OAuth 2 Server package',
	git: 'https://github.com/RocketChat/rocketchat-oauth2-server.git',
});

Package.onUse(function(api) {
	api.versionsFrom('1.0');
	api.use('ecmascript');
	api.mainModule('oauth.js', 'server');
	api.export('OAuth2Server');
});

Npm.depends({
	'oauth2-server': '2.4.1',
	express: '4.13.3',
});

// eslint-disable-next-line no-unused-vars
Package.onTest(function(api) {

});
