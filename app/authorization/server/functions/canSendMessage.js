import { canAccessRoomAsync } from './canAccessRoom';
import { hasPermissionAsync } from './hasPermission';
import { Subscriptions, Rooms, Contacts } from '../../../models/server/raw';
import { roomTypes, RoomMemberActions } from '../../../utils/server';
import { settings } from '../../../settings';
import { addContacts } from '../../../../imports/kameo/server';

const subscriptionOptions = {
	projection: {
		blocked: 1,
		blocker: 1,
	},
};

export const validateRoomMessagePermissionsAsync = async (room, { uid, username, type }, extraData) => {
	if (!room) {
		throw new Error('error-invalid-room');
	}

	if (type !== 'app' && !await canAccessRoomAsync(room, { _id: uid, username }, extraData)) {
		throw new Error('error-not-allowed');
	}

	if (roomTypes.getConfig(room.t).allowMemberAction(room, RoomMemberActions.BLOCK)) {
		const subscription = await Subscriptions.findOneByRoomIdAndUserId(room._id, uid, subscriptionOptions);
		if (subscription && (subscription.blocked || subscription.blocker)) {
			throw new Error('room_is_blocked');
		}
	}

	if (room.individualMain !== true && room.ro === true && !await hasPermissionAsync(uid, 'post-readonly', room._id)) {
		// Unless the user was manually unmuted
		if (!(room.unmuted || []).includes(username)) {
			throw new Error('You can\'t send messages because the room is readonly.');
		}
	}

	if (room?.muted?.includes(username)) {
		throw new Error('You_have_been_muted');
	}

	if (room.t === 'd' && room?.uids?.length === 2) {
		const cuid = room.uids.filter((u) => u !== uid).join('');
		const hasContacts = await Contacts.findOneByUserId(uid, cuid);
		const hasBlocked = hasContacts?.relation === 'D';
		if (hasBlocked) {
			throw new Error('room_is_blocked');
		}

		const hasFollow = ['F', 'B'].includes(hasContacts?.relation);
		const hasFollowByContact = await Contacts.findOneByIdAndFollow(cuid, uid);

		if (!hasFollow && hasFollowByContact) {
			const contact = addContacts(uid, cuid);
			Subscriptions.unsetInitialSentByUserId(room._id, contact.cu._id);
		}

		if (hasFollow && !hasFollowByContact) {
			const subscription = await Subscriptions.findOneByRoomIdAndUserId(room._id, uid);
			if (subscription) {
				const initialSent = Number(subscription?.initialSent ?? 0);
				if (initialSent >= settings.get('Message_AllowSend_Quantity')) {
					throw new Error('Message_sent_limit_exceeded');
				}

				Subscriptions.incInitialSentByUserId(room._id, uid);
			}
		}
	}
};

export const canSendMessageAsync = async (rid, { uid, username, type }, extraData) => {
	const room = await Rooms.findOneById(rid);
	await validateRoomMessagePermissionsAsync(room, { uid, username, type }, extraData);
	return room;
};

export const canSendMessage = (rid, { uid, username, type }, extraData) => Promise.await(canSendMessageAsync(rid, { uid, username, type }, extraData));
export const validateRoomMessagePermissions = (room, { uid, username, type }, extraData) => Promise.await(validateRoomMessagePermissionsAsync(room, { uid, username, type }, extraData));
