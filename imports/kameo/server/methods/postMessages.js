import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Messages, Rooms, Users } from '../../../../app/models';
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
	kameoCountDiscussionMessage(rid) {
		check(rid, String);

		// 没有类型，有消息内容，有房间ID
		const query = { rid, msg: { $exists: true }, t: { $exists: false } };

		return Messages.find(query).count();
	},
	kameoBotForwardMessage(message, sender, receiverId) {
		if (message.metadata.rid && message.metadata.category !== 'reaction') {
			if (message.metadata.tmid) {
				const threadMessage = Messages.findOne({ _id: message.metadata.tmid });
				// 在 thread 里自己评论自己
				if (sender._id === threadMessage.u._id && message.metadata.category === 'comment') {
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

		if (message.metadata.category === 'reaction') {
			const existMsg = Messages.findOne({
				t: 'activity',
				'u._id': sender._id,
				'metadata.category': message.metadata.category,
				'metadata.messageId': message.metadata.messageId,
				'metadata.reaction': message.metadata.reaction,
				'metadata.receiverId': receiverId,
			});
			// 重复点赞
			if (existMsg) {
				return;
			}
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
	kameoBotForwardSystemMessage(message, receiverId) {
		if (!message.msg) {
			return;
		}

		const systemMessage = {
			t: 'activity',
			ts: new Date(),
			attachments: [],
			metadata: {
				category: 'system',
			},
			...message,
		};

		const room = Meteor.runAsUser(receiverId, function() {
			const { rid } = Meteor.call('createDirectMessage', 'rocket.cat');
			return Rooms.findOneById(rid);
		});
		const sender = Users.findOneById('rocket.cat');

		Promise.await(sendMessage(sender, systemMessage, room, false));
	},
});
