import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { currentProduct } from '../utils';

// 占位页面
WebApp.connectHandlers.use('/perch', Meteor.bindEnvironment(function(req, res/* , next*/) {
	res.writeHead(200);
	res.write('');
	res.end();
}));

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
	const details = currentProduct({
		PAIYA: [
			{
				appID: 'C4N9FHZHPR.com.guakamoli.paiyatalent.ios',
				paths: ['NOT /login', 'NOT /oauth/*', '*'],
			},
			{
				appID: 'C4N9FHZHPR.com.guakamoli.paiya.ios',
				paths: ['NOT /oauth/*', '/login'],
			},
		],
		GODUCK: [
			{
				appID: 'K6X9285QVU.co.goduck.goducktalent.ios',
				paths: ['NOT /login', 'NOT /oauth/*', '*'],
			},
			{
				appID: 'K6X9285QVU.co.goduck.goduck.ios',
				paths: ['NOT /oauth/*', '/login'],
			},
		],
	});

	const data = {
		applinks: {
			apps: [],
			details,
		},
	};

	res.writeHead(200, { 'content-type': 'application/json' });
	res.write(JSON.stringify(data));
	res.end();
}));
