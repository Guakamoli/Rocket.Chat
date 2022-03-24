import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions } from '../../app/models';

Meteor.methods({
	ignoreUser({ rid, userId: ignoredUser, ignore = true }) {
		check(ignoredUser, String);
		check(rid, String);
		check(ignore, Boolean);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'ignoreUser',
			});
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId);

		if (!subscription) {
			Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: ignoredUser, ignore, subscriptionId: subscription?._id, roomId: subscription?.rid });
			return true;
		}
		// if (!subscription) {
		// 	throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', { method: 'ignoreUser' });
		// }

		const subscriptionIgnoredUser = Subscriptions.findOneByRoomIdAndUserId(rid, ignoredUser);

		if (!subscriptionIgnoredUser) {
			throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', { method: 'ignoreUser' });
		}
		const ignoreUser = Subscriptions.ignoreUser({ _id: subscription._id, ignoredUser, ignore });

		Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: ignoredUser, ignore, subscriptionId: subscription._id, roomId: subscription.rid });

		return !!ignoreUser;
	},
});
