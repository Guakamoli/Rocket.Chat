import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Contacts } from '../models';
import { Rooms } from '../../../../app/models';

Meteor.methods({
	kameoBlockContact({ cuid }) {
		check(cuid, String);

		const cu = Meteor.users.findOne({ _id: cuid });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		const userId = Meteor.userId();
		const user = Meteor.user();
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		Contacts.blockedUser({ _id: userId, username: user.username }, { _id: cu._id, username: cu.username }, { relation: 'D', blocked: true });
		Contacts.blockedUser({ _id: cu._id, username: cu.username }, { _id: userId, username: user.username }, { relation: 'D', blocker: true });

		// 退出各自的房间
		if (cu?.customFields?.defaultChannel && user.__rooms.includes(cu?.customFields?.defaultChannel)) {
			Meteor.runAsUser(this.userId, () => {
				Meteor.call('leaveRoom', cu?.customFields?.defaultChannel);
			});
		}
		if (user?.customFields?.defaultChannel && cu.__rooms.includes(user?.customFields?.defaultChannel)) {
			Meteor.runAsUser(cu._id, () => {
				Meteor.call('leaveRoom', user?.customFields?.defaultChannel);
			});
		}

		// 在私聊中blocked对方
		const room = Rooms.findByDirectRoomId(this.userId, cuid);
		if (room) {
			Meteor.call('blockUser', { rid: room._id, blocked: cuid, type: 'direct' });
		}
	},

	kameoUnblockContact({ cuid }) {
		check(cuid, String);

		const cu = Meteor.users.findOne({ _id: cuid });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		const contact = Contacts.findById(Meteor.userId(), cu._id);
		if (contact && contact.blocked) {
			const options = {};
			if (!contact.blocker) {
				options.relation = 'N';

				// 在私聊中unblock对方
				const room = Rooms.findByDirectRoomId(Meteor.userId(), cuid);
				if (room) {
					Meteor.call('unblockUser', { rid: room._id, blocked: cuid, type: 'direct' });
				}
			}
			Contacts.unblockedUser(Meteor.userId(), cu._id, { blocked: false, ...options });
			Contacts.unblockedUser(cu._id, Meteor.userId(), { blocker: false, ...options });
		}
	},
	kameoSomeoneBlockedContacts(...members) {
		check(members, Array);

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
	},
});
