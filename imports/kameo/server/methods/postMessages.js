import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import mem from 'mem';

import { Messages, Rooms, Users } from '../../../../app/models';
import { Contacts } from '../models';
import { sendMessage } from '../../../../app/lib/server/functions';

const getContactRelationCached = mem(({ uid, cuid }) => {
	const contact = Contacts.findById(uid, cuid, { projection: { relation: 1 } });
	return contact?.relation || 'N';
}, { maxAge: 1000 });

const getUserNameCached = mem((userId) => {
	const user = Users.findOne(userId, { projection: { name: 1 } });
	return user?.name || '';
}, { maxAge: 1000 });

Meteor.methods({
	kameoPostMessages(messages, type) {
		check(messages, [String]);
		check(type, Match.Optional(Match.OneOf('homepage')));

		const hasInternal = process.env.ROCKETCHAT_INTERNAL_API_ENABLE === 'true';
		return messages.map((msgId) => {
			const msg = Messages.findOneById(msgId);

			if (!msg) {
				return undefined;
			}

			if (type === 'homepage') {
				const comment = Messages.findOneLatestById(msg.drid);
				if (comment) {
					comment.u = {
						...comment.u,
						name: getUserNameCached(comment.u._id),
					};
				}

				msg.latestComment = comment;
			}

			msg.u = {
				...msg.u,
				relation: !hasInternal ? getContactRelationCached({ uid: Meteor.userId(), cuid: msg.u._id }) : 'N',
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
				} else {
					// 如果一级评论不是发送人则追加提醒
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

	kameoNumberOfPost(userId) {
		const query = { 'u._id': userId, t: 'post' };
		return Messages.find(query).count();
	},
});
