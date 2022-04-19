import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions, Users } from '../../../models';

Meteor.methods({
	unblockUser({ rid, blocked, type = 'direct' }) {
		check(rid, String);
		check(blocked, String);
		check(type, String);

		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		if (type === 'channel') {
			let subscription2 = null;
			const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId);

			const user = Users.findOneById(userId);
			if (user?.customFields?.defaultChannel) {
				subscription2 = Subscriptions.findOneByRoomIdAndUserId(user.customFields.defaultChannel, blocked);
			}

			if (subscription || subscription2) {
				Subscriptions.unsetBlockerByRoomId(subscription?.rid, userId);
				Subscriptions.unsetNewBlockedByRoomId(subscription2?.rid, blocked);
			}

			Meteor.call('kameoUnblockContact', { cuid: blocked });

			return true;
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());
		const subscription2 = Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

		if (!subscription || !subscription2) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		Subscriptions.unsetBlockedByRoomId(rid, blocked, Meteor.userId());

		return true;
	},
});
