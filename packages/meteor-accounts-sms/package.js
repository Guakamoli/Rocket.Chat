Package.describe({
	name: 'guakamoli:meteor-accounts-sms',
	version: '1.1.0',
	summary: 'Allow users to login with their phone number.',
	git: 'https://github.com/guakamoli/meteor-accounts-sms.git',
});

// eslint-disable-next-line no-undef
Npm.depends({
	'@alicloud/sms-sdk': '1.1.6',
	twilio: '3.60.0',
});

Package.onUse(function(api) {
	api.versionsFrom('1.0');

	api.use([
		'random',
	], 'server');

	api.use([
		'accounts-base',
		'check',
		// 'dispatch:twilio@1.0.1',
		'meteor',
	], ['client', 'server']);

	// Export Accounts (etc) to packages using this one.
	api.imply('accounts-base', ['client', 'server']);

	api.addFiles('sms.js', ['client', 'server']);

	api.addFiles('sms_server.js', 'server');
	api.addFiles('sms_client.js', 'client');
});
