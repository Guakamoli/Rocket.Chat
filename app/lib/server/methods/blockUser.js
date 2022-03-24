import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions, Users } from '../../../models';
import { roomTypes, RoomMemberActions } from '../../../utils/server';
import { Rooms } from '../../../models/server';

Meteor.methods({
	blockUser({ rid, blocked }) {
		check(rid, String);
		check(blocked, String);

		const userId = Meteor.userId();
		let subscription2 = null;

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		const room = Rooms.findOne({ _id: rid });

		if (!roomTypes.getConfig(room.t).allowMemberAction(room, RoomMemberActions.BLOCK)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId);

		const user = Users.findOneById(userId);
		if (user?.customFields?.defaultChannel) {
			subscription2 = Subscriptions.findOneByRoomIdAndUserId(user.customFields.defaultChannel, blocked);
		}

		// tip: 不存在相关的关系则直接改recommend
		if (!subscription && !subscription2) {
			Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: true, subscriptionId: subscription?._id, roomId: subscription?.rid });
			return true;
		}

		Subscriptions.setNewBlockedByRoomId(subscription?.rid, blocked, userId, subscription2?.rid);

		Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: true, subscriptionId: subscription?._id, roomId: subscription?.rid });

		return true;
	},
});
