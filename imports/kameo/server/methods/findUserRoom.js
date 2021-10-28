import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Rooms } from '../../../../app/models';

Meteor.methods({
	kameoFindUserRoom({ userId, type = 'c' }) {
		check(userId, String);
		check(type, String);

		return Rooms.findByUserIdAndType(userId, type);
	},
});
