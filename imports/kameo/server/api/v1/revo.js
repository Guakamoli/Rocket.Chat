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
			signature: Match.Maybe(String),
			wallet: Match.Maybe(String),
			tokenId: Match.Optional(String),
			mintAddress: Match.Optional(String),
			tokenAccount: Match.Optional(String),
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

		const newMsg = {
			...msg,
			metadata: {
				...msg?.metadata,
				nft,
			},
		};

		const user = Meteor.users.findOne(newMsg.u._id);
		updateMessage(newMsg, user, msg);

		return API.v1.success();
	},
});
