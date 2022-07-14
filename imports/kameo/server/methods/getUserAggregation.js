import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Contacts } from '../models';

Meteor.methods({
	getUserAggregation(userId) {
		check(userId, String);
		const u = Meteor.users.findOne({ _id: String(userId) });
		if (!u) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" param provided does not match any users');
		}
		const fansCursor = Contacts.allFansById(u._id);
		const followsCursor = Contacts.allFollowById(u._id, { page: { offset: 0 } });
		const fansCount = fansCursor.count();
		const followsCount = followsCursor.count();
		return {
			fansCount,
			followsCount,
		};
	},
});
