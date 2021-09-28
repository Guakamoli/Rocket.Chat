import { Meteor } from 'meteor/meteor';

import { Users } from '../../app/models';

Meteor.methods({
	findUser() {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'findUser',
			});
		}

		const user = Users.findOneById(Meteor.userId());
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user to find', {
				method: 'findUser',
			});
		}

		return user;
	},
});
