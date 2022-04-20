import { Meteor } from 'meteor/meteor';

import { callbacks } from '../../../../app/callbacks';

const messageTypePost = 'post';
const messageTypeStory = 'story';
const messageTypeActivity = 'activity';
const messageTypeActivityReaction = 'reaction';
const messageTypeActivityReply = 'reply';
const messageTypeActivityComment = 'comment';
const allowMediaMessageTypes = [messageTypePost, messageTypeStory];
const allowPushReactions = [':heart:', ':+1:'];

// 机器人转发点赞消息至收件人通知
callbacks.add('afterSetReaction', (message, { user, reaction }) => {
	if (!allowPushReactions.includes(reaction)) {
		return;
	}

	if (message.u._id !== user._id) {
		const notificationMessage = {
			t: messageTypeActivity,
			ts: new Date(),
			attachments: message.attachments || [],
			metadata: {
				category: messageTypeActivityReaction,
				reaction,
				messageId: message._id,
				rid: message.rid || '',
				prid: message.prid || '',
				drid: message.drid || '',
				tmid: message.tmid || '',
				receiverId: message.u._id,
			},
			mentions: [{ ...message.u }],
		};
		Meteor.call('kameoBotForwardMessage', notificationMessage, user);
	}
}, callbacks.priority.MEDIUM, 'kameo_after_set_reaction_to_notification');

// 标记推荐消息删除
callbacks.add('afterDeleteMessage', function(message) {
	if (allowMediaMessageTypes.includes(message.t)) {
		const deleteMsg = { messageId: message._id, isDeleted: true };
		Meteor.call('kameoRocketmqSendPostMessage', deleteMsg);
	}

	return message;
}, callbacks.priority.HIGH, 'kameo_after_delete_message');

// 保存消息时创建 discussion, 并转发消息至推荐系统
callbacks.add('afterSaveMessage', function(message, room = {}) {
	if (!allowMediaMessageTypes.includes(message.t)) {
		return;
	}

	if (message?.metadata?.audit?.state === 'pass' && room._id) {
		if (message.t === messageTypePost) {
			Meteor.call('kameoRocketmqSendPostMessage', {
				messageId: message._id,
				ts: message.ts,
				influencerId: message.u._id,
				public: message.public || false, // 兼容没有免费作品的情况
				msg: message.msg || '',
			});
		}

		Meteor.runAsUser(message.u._id, () => Meteor.call('createDiscussion', {
			prid: room._id,
			pmid: message._id,
			t_name: `discussion-${ message._id }`,
			reply: '',
			users: [],
			encrypted: false,
		}));
	}
}, callbacks.priority.HIGH, 'kameo_after_save_post_message');

// 评论作品及回复评论
callbacks.add('afterSaveMessage', function(message) {
	if (allowMediaMessageTypes.includes(message.t)) {
		return;
	}

	if (message.t === messageTypeActivity && message.metadata.category === 'system') {
		return;
	}

	if (message.rid && message.msg) {
		const notificationMessage = {
			t: messageTypeActivity,
			ts: new Date(),
			metadata: {
				category: message.tmid ? messageTypeActivityReply : messageTypeActivityComment,
				content: message.msg,
				messageId: message._id,
				rid: message.rid || '',
				prid: message.prid || '',
				drid: message.drid || '',
				tmid: message.tmid || '',
			},
			mentions: message.mentions || [],
		};
		Meteor.call('kameoBotForwardMessage', notificationMessage, message.u);
	}
}, callbacks.priority.HIGH, 'kameo_after_save_activity_message');
