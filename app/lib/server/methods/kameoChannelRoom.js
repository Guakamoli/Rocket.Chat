import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Rooms } from '../../../models';

Meteor.methods({
	kameoFindUserRoom({ userId, type = 'c' }) {
		check(userId, String);

		return Rooms.findById(userId, type);
	},
});
