import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions } from '../../../models';
import { roomTypes, RoomMemberActions } from '../../../utils/server';
import { Rooms } from '../../../models/server';

Meteor.methods({
	blockUser({ rid, blocked }) {
		check(rid, String);
		check(blocked, String);

		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		const room = Rooms.findOne({ _id: rid });

		if (!roomTypes.getConfig(room.t).allowMemberAction(room, RoomMemberActions.BLOCK)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId);
		if (!subscription) {
			Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: true, subscriptionId: subscription?._id, roomId: subscription?.rid });
			return true;
		}
		const subscription2 = Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

		if (!subscription || !subscription2) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		Subscriptions.setBlockedByRoomId(rid, blocked, userId);

		Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: true, subscriptionId: subscription?._id, roomId: subscription?.rid });

		return true;
	},
});
