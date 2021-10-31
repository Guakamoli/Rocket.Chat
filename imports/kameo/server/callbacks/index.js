import { Meteor } from 'meteor/meteor';

import { callbacks } from '../../../../app/callbacks';

const allowPushReactions = [':heart:', ':+1:'];

callbacks.add('afterSetReaction', (message, { user, reaction }) => {
	if (allowPushReactions.includes(reaction)) {
		if (message.u._id !== user._id) {
			const notification = {
				postId: message._id,
				post: message,
				to: message.u._id,
				from: user._id,
				message: message.msg,
				type: 'like',
				notificationType: 'text',
			};
			Meteor.call('kameoRocketmqSendNotification', notification);
		}
	}
}, callbacks.priority.LOW, 'kameo_after_set_reaction');
