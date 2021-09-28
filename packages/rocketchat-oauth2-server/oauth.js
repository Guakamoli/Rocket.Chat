/* eslint-disable no-undef */
// Generated by CoffeeScript 2.6.0
import { Model } from './model.js';

const oauthserver = Npm.require('oauth2-server');
const express = Npm.require('express');

// WebApp.rawConnectHandlers.use(app)
// JsonRoutes.Middleware.use(app)
//

export class OAuth2Server {
	constructor(config = {}) {
		this.config = config;
		this.app = express();
		this.routes = express();
		this.model = new Model(this.config);
		this.silentClients = [];

		this.oauth = oauthserver({
			model: this.model,
			grants: ['authorization_code', 'refresh_token'],
			debug: this.config.debug,
		});

		this.publishAuhorizedClients();
		this.initRoutes();
	}

	addSilentClient(clientId) {
		return this.silentClients.push(clientId);
	}

	publishAuhorizedClients() {
		Meteor.publish('authorizedOAuth', function() {
			if (this.userId == null) {
				return this.ready();
			}

			return Meteor.users.find(
				{ _id: this.userId },
				{
					fields: {
						'oauth.authorizedClients': 1,
					},
				},
			);
		});
	}

	initRoutes() {
		const self = this;

		const debugMiddleware = function(req, res, next) {
			if (self.config.debug === true) {
				console.log('[OAuth2Server]', req.method, req.url);
			}
			next();
		};

		// Transforms requests which are POST and aren't "x-www-form-urlencoded" content type
		// and they pass the required information as query strings
		const transformRequestsNotUsingFormUrlencodedType = function(
			req,
			res,
			next,
		) {
			if (
				!req.is('application/x-www-form-urlencoded')
				&& req.method === 'POST'
			) {
				if (self.config.debug === true) {
					console.log(
						'[OAuth2Server]',
						'Transforming a request to form-urlencoded with the query going to the body.',
					);
				}
				req.headers['content-type'] = 'application/x-www-form-urlencoded';
				req.body = Object.assign({}, req.body, req.query);
			}
			next();
		};

		this.app.all(
			'/oauth/token',
			debugMiddleware,
			transformRequestsNotUsingFormUrlencodedType,
			this.oauth.grant(),
		);
		this.app.get(
			'/oauth/authorize',
			debugMiddleware,
			Meteor.bindEnvironment((req, res, next) => {
				const client = self.model.Clients.findOne({
					active: true,
					clientId: req.query.client_id,
				});

				if (client == null) {
					return res.redirect('/oauth/error/404');
				}

				if (![].concat(client.redirectUri).includes(req.query.redirect_uri)) {
					return res.redirect('/oauth/error/invalid_redirect_uri');
				}

				// console.log(this.silentClients, client.clientId, req.query, 'console.log(this.silentClients, client.clientId, req.query');
				// if (this.silentClients.includes(client.clientId)) {
				// 	const url = new URL();
				// 	url.searchParams.set('state', req.query.state);
				// 	return res.redirect(req.query.redirect_uri);
				// }

				next();
			}),
		);

		this.app.post(
			'/oauth/authorize',
			debugMiddleware,
			Meteor.bindEnvironment(function(req, res, next) {
				if (req.body.token == null) {
					return res.sendStatus(401).send('No token');
				}

				const user = Meteor.users.findOne({
					'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(
						req.body.token,
					),
				});

				if (user == null) {
					return res.sendStatus(401).send('Invalid token');
				}

				req.user = {
					id: user._id,
				};

				next();
			}),
		);

		this.app.post(
			'/oauth/authorize',
			debugMiddleware,
			this.oauth.authCodeGrant(function(req, next) {
				if (req.body.allow === 'yes') {
					Meteor.users.update(req.user.id, {
						$addToSet: {
							'oauth.authorizedClients': this.clientId,
						},
					});
				}

				next(null, req.body.allow === 'yes', req.user);
			}),
		);

		this.app.use(this.routes);
		this.app.all('/oauth/*', this.oauth.errorHandler());
	}
}
