import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Subscriptions, Users } from '../../../models';
import { roomTypes, RoomMemberActions } from '../../../utils/server';
import { Rooms } from '../../../models/server';

Meteor.methods({
	blockUser({ rid, blocked, type = 'direct' }) {
		check(rid, String);
		check(blocked, String);
		check(type, String);

		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		const room = Rooms.findOne({ _id: rid });

		if (!roomTypes.getConfig(room.t).allowMemberAction(room, RoomMemberActions.BLOCK)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		if (type === 'channel') {
			let subscription2 = null;
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

			Subscriptions.setBlockerByRoomId(subscription?.rid, userId);
			Subscriptions.setNewBlockedByRoomId(subscription2?.rid, blocked);

			Meteor.call('kameoRocketmqSendBlocked', { userId, influencerId: blocked, blocked: true, subscriptionId: subscription?._id, roomId: subscription?.rid });

			return true;
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());
		const subscription2 = Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

		if (!subscription || !subscription2) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'blockUser' });
		}

		Subscriptions.setBlockedByRoomId(rid, blocked, Meteor.userId());

		return true;
	},
});
