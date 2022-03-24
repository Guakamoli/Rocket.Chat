import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions, Users } from '../../../models';

Meteor.methods({
	unblockUser({ rid, blocked }) {
		check(rid, String);
		check(blocked, String);

		const userId = Meteor.userId();
		let subscription2 = null;

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId);

		const user = Users.findOneById(userId);
		if (user?.customFields?.defaultChannel) {
			subscription2 = Subscriptions.findOneByRoomIdAndUserId(user.customFields.defaultChannel, blocked);
		}


		if (!subscription && !subscription2) {
			Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: false, subscriptionId: subscription?._id, roomId: subscription?.rid });
			return true;
		}

		Subscriptions.unsetNewBlockedByRoomId(rid, blocked, userId, user?.customFields?.defaultChannel);

		Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: false, subscriptionId: subscription?._id, roomId: subscription?.rid });

		return true;
	},
});
