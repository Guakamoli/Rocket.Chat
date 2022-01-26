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
		if (message.metadata.category === 'reaction') {
			const existMsg = Messages.findOne({
				t: 'activity',
				'metadata.category': message.metadata.category,
				'metadata.messageId': message.metadata.messageId,
			});
			if (existMsg) {
				return;
			}
		}

		if (message.metadata.rid && message.metadata.category !== 'reaction') {
			if (message.metadata.tmid) {
				const threadMessage = Messages.findOne({ _id: message.metadata.tmid });
				// 在 thread 里自己评论自己
				if (sender._id === threadMessage.u._id) {
					return;
				}
				receiverId = threadMessage.u._id;
			}

			const firstDiscussionMessage = Messages.findOne({ rid: message.metadata.rid }, { sort: { ts: 1 } });
			message.metadata.messageId = firstDiscussionMessage._id;
			message.metadata.prid = firstDiscussionMessage.prid;
			message.metadata.drid = firstDiscussionMessage.drid;
			message.attachments = firstDiscussionMessage.attachments || [];
		}

		// 在 channel 里自己评论自己
		if (sender._id === receiverId) {
			return;
		}

		const room = Meteor.runAsUser(receiverId, function() {
			const { rid } = Meteor.call('createDirectMessage', 'rocket.cat');
			return Rooms.findOneById(rid);
		});

		Promise.await(sendMessage(sender, message, room, false));
	},
});
