import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { Users } from '../../../../app/models';

Meteor.methods({
	kameoFindPhoneUser({ phoneNumber, username }) {
		check(phoneNumber, Match.Optional(String));
		check(username, Match.Optional(String));

		let user = {};
		if (phoneNumber) {
			user = Users.findByRealPhoneNumber(phoneNumber);
		}
		if (username) {
			user = Users.findOneByUsername(username);
		}
		return user;
	},
});
