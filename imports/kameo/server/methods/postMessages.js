import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import mem from 'mem';

import { Messages, Rooms, Users } from '../../../../app/models';
import { Contacts } from '../models';
import { sendMessage } from '../../../../app/lib/server/functions';

const getContactRelationCached = mem((uid, cuid) => {
	const contact = Contacts.findById(uid, cuid, { projection: { relation: 1 } });
	return contact?.relation || 'N';
}, { maxAge: 5000 });

Meteor.methods({
	kameoPostMessages(messages, type = '') {
		check(messages, [String]);
		check(type, String);

		const hasInternal = process.env.ROCKETCHAT_INTERNAL_API_ENABLE === 'true';
		return messages.map((msgId) => {
			const msg = Messages.findOneById(msgId);
			let latestComment = null;

			if (!msg) {
				return undefined;
			}

			if (type === 'homepage') {
				latestComment = Messages.findLatestByRid({ rid: msg.drid, 'u._id': { $ne: msg.u._id } }, { sort: { ts: -1 } });
				msg.latestComment = latestComment;
			}

			msg.u = {
				...msg.u,
				relation: !hasInternal ? getContactRelationCached(Meteor.userId(), msg.u._id) : 'N',
			};

			return msg;
		});
	},
	kameoCountDiscussionMessage(rid) {
		check(rid, String);

		// 没有类型，有消息内容，有房间ID
		const query = { rid, msg: { $exists: true }, t: { $exists: false } };

		return Messages.find(query).count();
	},
	kameoBotForwardMessage(message, sender) {
		if (message.metadata.rid && ['comment', 'reply'].includes(message.metadata.category)) {
			if (message.metadata.tmid) {
				const threadMessage = Messages.findOne({ _id: message.metadata.tmid });

				if (sender._id === threadMessage.u._id) {
					message.mentions = message.mentions.filter((user) => user._id !== sender._id);
				}

				if (!message.mentions.some((mantion) => mantion._id === threadMessage.u._id)) {
					message.mentions.push({ ...threadMessage.u });
				}
			}

			const firstDiscussionMessage = Messages.findOne({ drid: message.metadata.rid }, { sort: { ts: 1 } });
			if (firstDiscussionMessage) {
				message.metadata.messageId = firstDiscussionMessage._id;
				message.metadata.rid = firstDiscussionMessage.rid;
				message.metadata.drid = firstDiscussionMessage.drid;
				message.attachments = firstDiscussionMessage.attachments || [];

				// 没有接收人
				if (message.mentions.length === 0) {
					message.mentions.push({ ...firstDiscussionMessage.u });
				}
			}
		}

		if (message.metadata.category === 'reaction') {
			const existMsg = Messages.findOne({
				t: 'activity',
				'u._id': sender._id,
				'metadata.category': message.metadata.category,
				'metadata.messageId': message.metadata.messageId,
				'metadata.reaction': message.metadata.reaction,
				'metadata.receiverId': message.metadata.receiverId,
			});
			// 重复点赞
			if (existMsg) {
				return;
			}
		}

		for (const mention of message.mentions) {
			const room = Meteor.runAsUser(mention._id, function() {
				const { rid } = Meteor.call('createDirectMessage', 'rocket.cat');
				return Rooms.findOneById(rid);
			});

			Promise.await(sendMessage(sender, message, room, false));
		}
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
