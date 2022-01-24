import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Messages, Rooms } from '../../../../app/models';
import { sendMessage } from '../../../../app/lib/server/functions';

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
	kameoBotForwardMessage(message, sender, receiverId) {
		const room = Meteor.runAsUser(receiverId, function() {
			const { rid } = Meteor.call('createDirectMessage', 'rocket.cat');
			return Rooms.findOneById(rid);
		});

		if (message.metadata.rid && message.metadata.category !== 'reaction') {
			const firstDiscussionMessage = Messages.findOne({ rid: message.metadata.rid }, { sort: { ts: 1 } });
			message.metadata.messageId = firstDiscussionMessage._id;
			message.metadata.prid = firstDiscussionMessage.prid;
			message.metadata.drid = firstDiscussionMessage.drid;
			message.attachments = firstDiscussionMessage.attachments || [];
		}

		Promise.await(sendMessage(sender, message, room, false));
	},
});
