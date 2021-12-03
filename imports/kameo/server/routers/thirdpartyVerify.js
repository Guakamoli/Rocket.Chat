import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

WebApp.connectHandlers.use('/h9esIHXgl4.txt', Meteor.bindEnvironment(function(req, res/* , next*/) {
	res.writeHead(200);
	res.write('d7eb4f6879fd40a737bc2887988a344f');
	res.end();
}));

WebApp.connectHandlers.use('/kdGu9D1xAS.txt', Meteor.bindEnvironment(function(req, res/* , next*/) {
	res.writeHead(200);
	res.write('17a3dcf4d4c56546d2a63b08c1e94ded');
	res.end();
}));

WebApp.connectHandlers.use('/.well-known/apple-app-site-association', Meteor.bindEnvironment(function(req, res/* , next*/) {
	const data = {
		applinks: {
			apps: [],
			details: [
				{
					appID: 'K6X9285QVU.co.goduck.goducktalent.ios',
					paths: ['NOT /login', '*'],
				},
				{
					appID: 'K6X9285QVU.co.goduck.goduck.ios',
					paths: ['/login'],
				},
			],
		},
	};

	res.writeHead(200, { 'content-type': 'application/json' });
	res.write(JSON.stringify(data));
	res.end();
}));
