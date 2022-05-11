import { Meteor } from 'meteor/meteor';

import { Contacts } from '../models';
import { Rooms, Subscriptions } from '../../../../app/models';

export function addContacts(userId, cuid) {
	if (userId === cuid) {
		throw new Meteor.Error('failed-follow', 'Can\'t to follow on yourself');
	}

	const u = Meteor.users.findOne({ _id: userId });
	if (!u) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	const cu = Meteor.users.findOne({ _id: cuid });
	if (!cu) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	const contact = Contacts.findById(u._id, cuid);
	if (contact?.blocked) {
		throw new Meteor.Error('failed-follow', 'You need to remove the user\'s attention after blocking it');
	}
	if (contact?.blocker) {
		throw new Meteor.Error('failed-follow', 'Due to the other\'s privacy settings, it cannot be follow');
	}

	if (cu?.customFields?.defaultChannel) {
		Meteor.runAsUser(u._id, () => {
			Meteor.call('joinRoom', cu.customFields.defaultChannel);
		});
	}

	Contacts.createAndUpdate(
		{ _id: u._id, username: u.username },
		{ _id: cu._id, username: cu.username },
	);
	Contacts.updateBothById(u._id, cu._id);

	if (Contacts.findByIdAndFollowBoth(u._id, cu._id)) {
		const rid = [u._id, cu._id].sort().join('');
		Subscriptions.removeStrangerByUserId(rid, u._id);
		Subscriptions.removeStrangerByUserId(rid, cu._id);
		Rooms.shutStrangerById(rid);
	}

	return Contacts.findById(u._id, cu._id);
}

export function blockContacts(userId, cuid) {
	const u = Meteor.users.findOne({ _id: userId });
	if (!u) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	const cu = Meteor.users.findOne({ _id: cuid });
	if (!cu) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	Contacts.blockedUser({ _id: u._id, username: u.username }, { _id: cu._id, username: cu.username }, { relation: 'D', blocked: true });
	Contacts.blockedUser({ _id: cu._id, username: cu.username }, { _id: u._id, username: u.username }, { relation: 'D', blocker: true });

	// 退出各自的房间
	if (cu?.customFields?.defaultChannel && u.__rooms.includes(cu?.customFields?.defaultChannel)) {
		Meteor.runAsUser(u._id, () => {
			Meteor.call('leaveRoom', cu?.customFields?.defaultChannel);
		});
	}
	if (u?.customFields?.defaultChannel && cu.__rooms.includes(u?.customFields?.defaultChannel)) {
		Meteor.runAsUser(cu._id, () => {
			Meteor.call('leaveRoom', u?.customFields?.defaultChannel);
		});
	}

	// 在私聊中blocked对方
	const rid = [u._id, cu._id].sort().join('');
	const room = Rooms.findByDirectRoomId(rid);
	if (room) {
		Meteor.call('blockUser', { rid: room._id, blocked: cu._id, type: 'direct' });
	}
}

export function unblockContacts(userId, cuid) {
	const u = Meteor.users.findOne({ _id: userId });
	if (!u) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	const cu = Meteor.users.findOne({ _id: cuid });
	if (!cu) {
		throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
	}

	const contact = Contacts.findById(u._id, cu._id);
	if (contact && contact.blocked) {
		const options = {};
		if (!contact.blocker) {
			options.relation = 'N';
		}
		Contacts.unblockedUser(u._id, cu._id, { blocked: false, ...options });
		Contacts.unblockedUser(cu._id, u._id, { blocker: false, ...options });

		// 在私聊中unblock对方
		const rid = [u._id, cu._id].sort().join('');
		const room = Rooms.findByDirectRoomId(rid);
		if (room) {
			Meteor.call('unblockUser', { rid: room._id, blocked: cu._id, type: 'direct' });
		}
	}
}

export function someoneBlockedContacts(...members) {
	if (members.length !== 2) {
		throw new Meteor.Error('invalid-params', 'The required "Member" parameter provided by must be 2 length.');
	}

	const [uid, cuid] = members;

	const queryOrBlockedAndBlocker = [
		{ blocked: true },
		{ blocker: true },
	];

	const query = {
		$or: [
			{
				'u._id': uid,
				'cu._id': cuid,
				$or: queryOrBlockedAndBlocker,
			},
			{
				'u._id': cuid,
				'cu._id': uid,
				$or: queryOrBlockedAndBlocker,
			},
		],
	};
	const contacts = Contacts.find(query).fetch();
	return contacts.length > 0;
}
