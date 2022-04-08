import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Contacts } from '../index';

Meteor.methods({
	kameoAddContact({ uid, fuid }) {
		check(uid, String);
		check(fuid, String);

		Contacts.create(uid, fuid);
	},
});
