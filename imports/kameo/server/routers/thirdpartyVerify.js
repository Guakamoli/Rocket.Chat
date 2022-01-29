import { WebApp } from 'meteor/webapp';
import express from 'express';

import { currentProduct } from '../utils';
import { Users } from '../../../../app/models';

const app = express();

app.disable('x-powered-by');

app.use('/h9esIHXgl4.txt', (req, res) => {
	res.send('d7eb4f6879fd40a737bc2887988a344f');
});

app.use('/kdGu9D1xAS.txt', (req, res) => {
	res.send('17a3dcf4d4c56546d2a63b08c1e94ded');
});

app.use('/.well-known/apple-app-site-association', (req, res) => {
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

	res.send(data);
});

// 存活检查
app.use('/ping', (req, res) => {
	res.send('pong');
});

// 就绪检查
app.use('/healthz', (req, res) => {
	if (!Users.findOneById('rocket.cat')) {
		res.status(500);
	}
	res.end();
});

WebApp.connectHandlers.use(app);
