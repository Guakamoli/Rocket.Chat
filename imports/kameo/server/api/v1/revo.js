import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { API } from '../../../../../app/api/server/api';
import { notify } from '../../functions/revo';
import { Messages } from '../../../../../app/models';
import { updateMessage } from '../../../../../app/lib/server/functions';

const SECRET = process.env.INTERNAL_X_SECRET || '';

API.v1.addRoute('revo.notify', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			userId: String,
			eventName: String,
			eventData: Object,
		});

		notify(this.bodyParams);

		return API.v1.success();
	},
});

API.v1.addRoute('chat.updateNftMessage', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			postId: String,
			commited: Match.Maybe(String),
			name: Match.Maybe(String),
			wallet: Match.Maybe(String),
			holder: Match.Optional(String),
			tokenHash: Match.Optional(String),
			tokenId: Match.Optional(String),
			tokenURI: Match.Optional(String),
			blockNumber: Match.Optional(String),
			normalizeMetadata: Match.Optional(Object),
			deleted: Match.Optional(Boolean),
		});

		const msg = Messages.findOneById(this.bodyParams.postId);
		if (!msg) {
			return API.v1.failure({ message: 'Message not found' });
		}

		const nft = {
			...msg?.metadata?.nft,
			...this.bodyParams,
		};
		delete nft.postId;
		if (!this.bodyParams?.wallet) {
			delete nft.wallet;
		}

		const newMsg = {
			...msg,
			metadata: {
				...msg?.metadata,
				nft,
			},
		};

		if (this.bodyParams.deleted && Boolean(this.bodyParams.deleted)) {
			newMsg.metadata.nft = {};
		}

		const user = Meteor.users.findOne(newMsg.u._id);
		updateMessage(newMsg, user, msg);

		return API.v1.success();
	},
});

const OGPassV1fields = { 'nft.OGPassV1Id': 1, 'nft.OGPassV1Owner': 1, 'nft.OGPassV1Mint': 1 };

API.v1.addRoute('chat.fetchOGPassV1', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			userId: String,
		});

		const nft = Meteor.users.findOne({ _id: this.bodyParams.userId }, { fields: OGPassV1fields });
		return API.v1.success(nft);
	},
});

API.v1.addRoute('chat.fetchOGPassV1ByTokenIds', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			tokenIds: [String],
		});

		const selector = {
			'nft.OGPassV1Id': {
				$exists: true,
				$in: this.bodyParams.tokenIds || [],
			},
		};
		const users = Meteor.users.find(selector).fetch();
		return API.v1.success({ users });
	},
});

API.v1.addRoute('chat.addWallets', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			accountId: String,
			chain: String,
			address: Match.Optional(String),
		});

		const { accountId, chain, address } = this.bodyParams;

		const modifier = {};
		if (address) {
			modifier.$set = {
				[`wallets.${ chain }`]: address,
			};
		} else {
			modifier.$unset = {
				[`wallets.${ chain }`]: 1,
			};
		}
		Meteor.users.update({ _id: accountId }, modifier);

		return API.v1.success();
	},
});

API.v1.addRoute('chat.getWallets', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			chain: String,
			address: String,
		});

		const { chain, address } = this.bodyParams;

		const users = Meteor.users.find({ [`wallets.${ chain }`]: address }).fetch();

		return API.v1.success({ users });
	},
});

API.v1.addRoute('chat.updateOGPassOwner', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			accountId: Match.Optional(String),
			token: Match.Optional({
				id: String,
				owner: String,
				mint: String,
			}),
		});

		if (!this.bodyParams.accountId && !this.bodyParams.token) {
			return API.v1.failure('Missing required parameters');
		}

		const { accountId, token } = this.bodyParams;

		const selector = {};
		const modifier = {};
		if (accountId) {
			// 通过用户ID解绑OG Pass
			modifier.$unset = OGPassV1fields;
			selector._id = accountId;
			if (accountId && token) {
				// 清除绑定过的OG Pass
				Meteor.users.update({ 'nft.OGPassV1Id': token.id }, modifier);

				// 绑定OG Pass
				modifier.$set = {
					'nft.OGPassV1Id': token.id,
					'nft.OGPassV1Owner': token.owner,
					'nft.OGPassV1Mint': token.mint,
				};
				delete modifier.$unset;
			}
		} else if (token) {
			// 通过TokenID解绑OG Pass
			selector['nft.OGPassV1Id'] = token.id;
			modifier.$unset = OGPassV1fields;
		}
		const updated = Meteor.users.update(selector, modifier);

		return API.v1.success({ updated });
	},
});
