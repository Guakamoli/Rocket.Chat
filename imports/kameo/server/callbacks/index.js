import { Meteor } from 'meteor/meteor';

import { callbacks } from '../../../../app/callbacks';

const allowMessageTypes = ['post', 'story'];
const allowPushReactions = [':heart:', ':+1:'];

// 机器人转发点赞消息至收件人通知
callbacks.add('afterSetReaction', (message, { user, reaction }) => {
	if (allowPushReactions.includes(reaction) && message.u._id !== user._id) {
		const notificationMessage = {
			t: 'activity',
			ts: new Date(),
			attachments: message.attachments || [],
			metadata: {
				category: 'reaction',
				reaction,
				messageId: message._id,
				rid: message.rid || '',
				prid: message.prid || '',
				drid: message.drid || '',
				tmid: message.tmid || '',
				receiverId: message.u._id,
			},
		};
		Meteor.call('kameoBotForwardMessage', notificationMessage, user, message.u._id);
	}
}, callbacks.priority.LOW, 'kameo_after_set_reaction_to_notification');

// 标记推荐消息删除
callbacks.add('afterDeleteMessage', function(message) {
	if (allowMessageTypes.includes(message.t)) {
		const deleteMsg = { messageId: message._id, isDeleted: true };
		Meteor.call('kameoRocketmqSendPostMessage', deleteMsg);
	}

	return message;
}, callbacks.priority.MEDIUM, 'kameo_after_delete_message');

// 保存消息时创建 discussion, 并转发消息至推荐系统
callbacks.add('afterSaveMessage', function(message, room, userId) {
	if (allowMessageTypes.includes(message.t)) {
		Meteor.call('kameoRocketmqSendPostMessage', {
			messageId: message._id,
			ts: message.ts,
			influencerId: message.u._id,
			public: message.public || false, // 兼容没有免费作品的情况
			msg: message.msg || '',
		});

		Meteor.runAsUser(userId, () => Meteor.call('createDiscussion', {
			prid: room._id,
			pmid: message._id,
			t_name: `discussion-${ message._id }`,
			reply: '',
			users: [],
			encrypted: false,
		}));
	}
}, callbacks.priority.MEDIUM, 'kameo_after_save_post_message');

// 评论作品及回复评论
callbacks.add('afterSaveMessage', function(message, room) {
	if (!allowMessageTypes.includes(message.t) && message.rid && message.msg) {
		const notificationMessage = {
			t: 'activity',
			ts: new Date(),
			metadata: {
				category: message.tmid ? 'reply' : 'comment',
				content: message.msg,
				rid: message.rid,
			},
		};
		if (message.tmid) {
			notificationMessage.metadata.tmid = message.tmid;
		}
		Meteor.call('kameoBotForwardMessage', notificationMessage, message.u, room.u._id);
	}
}, callbacks.priority.LOW, 'kameo_after_save_message_to_notification');
