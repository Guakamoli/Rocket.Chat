import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { addContacts, blockContacts, unblockContacts, someoneBlockedContacts } from '../functions/contacts';

Meteor.methods({
	kameoAddContacts({ cuid }) {
		check(cuid, String);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		return addContacts(userId, cuid);
	},
	kameoBlockContacts({ cuid }) {
		check(cuid, String);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		return blockContacts(userId, cuid);
	},

	kameoUnblockContacts({ cuid }) {
		check(cuid, String);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		return unblockContacts(userId, cuid);
	},
	kameoSomeoneBlockedContacts(...members) {
		check(members, Array);

		return someoneBlockedContacts(...members);
	},
});
