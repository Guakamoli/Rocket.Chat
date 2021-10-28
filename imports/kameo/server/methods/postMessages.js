import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Messages } from '../../../../app/models';

Meteor.methods({
	kameoPostMessages(messages) {
		check(messages, [String]);

		return messages.map((msgId) => {
			const msg = Messages.findOneById(msgId);

			if (!msg) {
				return undefined;
			}
			return msg;
		});
	},
});
