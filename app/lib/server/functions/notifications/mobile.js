import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { settings } from '../../../../settings';
import { Subscriptions } from '../../../../models';
import { roomTypes } from '../../../../utils';

const CATEGORY_MESSAGE = 'MESSAGE';
const CATEGORY_MESSAGE_NOREPLY = 'MESSAGE_NOREPLY';

let SubscriptionRaw;
Meteor.startup(() => {
	SubscriptionRaw = Subscriptions.model.rawCollection();
});

async function getBadgeCount(userId) {
	const [result = {}] = await SubscriptionRaw.aggregate([
		{ $match: { 'u._id': userId, archived: { $ne: true } } },
		{
			$group: {
				_id: 'total',
				total: { $sum: '$unread' },
			},
		},
	]).toArray();

	const { total } = result;
	return total;
}

function enableNotificationReplyButton(room, username) {
	// Some users may have permission to send messages even on readonly rooms, but we're ok with false negatives here in exchange of better perfomance
	if (room.ro === true) {
		return false;
	}

	if (!room.muted) {
		return true;
	}

	return !room.muted.includes(username);
}

export async function getPushData({ room, message, userId, senderUsername, senderName, notificationMessage, receiver, shouldOmitMessage = true }) {
	const username = (settings.get('Push_show_username_room') && settings.get('UI_Use_Real_Name') && senderName) || senderUsername;

	const lng = receiver.language || settings.get('Language') || 'en';

	let messageText;
	if (shouldOmitMessage && settings.get('Push_request_content_from_server')) {
		messageText = TAPi18n.__('You_have_a_new_message', { lng });
	} else if (!settings.get('Push_show_message')) {
		messageText = TAPi18n.__('You_have_a_new_message', { lng });
	} else {
		messageText = notificationMessage;
	}

	const pushExtra = {
		pushType: '',
		pushCategory: '',
		pushMetadata: message.metadata || {},
	};
	switch (message.t) {
		case 'story':
		case 'post':
		{
			pushExtra.pushType = 'post';
			pushExtra.pushCategory = 'post';
			pushExtra.pushMetadata = {
				messageId: message._id,
				rid: message.rid || '',
				prid: message.prid || '',
				drid: message.drid || '',
				tmid: message.tmid || '',
				content: message.msg,
			};
			break;
		}
		case 'activity':
		{
			pushExtra.pushType = 'activity';
			if (message.metadata.category) {
				pushExtra.pushCategory = message.metadata.category;
			}
			break;
		}
		default:
		{
			if (message.rid && message.msg) {
				pushExtra.pushType = 'chat';
				pushExtra.pushCategory = 'direct'; // TODO: 先不处理群聊问题
				pushExtra.pushMetadata = {
					messageId: message._id,
					rid: message.rid,
					prid: message.prid || '',
					drid: message.drid || '',
					tmid: message.tmid || '',
					content: message.msg,
				};
			}
			break;
		}
	}

	return {
		payload: {
			sender: message.u,
			senderName: username,
			type: room.t,
			name: settings.get('Push_show_username_room') ? room.name : '',
			messageType: message.t,
			tmid: message.tmid,
			...message.t === 'e2e' && { msg: message.msg },
			pushExtra,
		},
		roomName: settings.get('Push_show_username_room') && roomTypes.getConfig(room.t).isGroupChat(room) ? `#${ roomTypes.getRoomName(room.t, room) }` : '',
		username,
		message: messageText,
		badge: await getBadgeCount(userId),
		category: enableNotificationReplyButton(room, receiver.username) ? CATEGORY_MESSAGE : CATEGORY_MESSAGE_NOREPLY,
	};
}

export function shouldNotifyMobile({
	disableAllMessageNotifications,
	mobilePushNotifications,
	hasMentionToAll,
	isHighlighted,
	hasMentionToUser,
	hasReplyToThread,
	roomType,
	isThread,
}) {
	if (settings.get('Push_enable') !== true) {
		return false;
	}

	if (disableAllMessageNotifications && mobilePushNotifications == null && !isHighlighted && !hasMentionToUser && !hasReplyToThread) {
		return false;
	}

	if (mobilePushNotifications === 'nothing') {
		return false;
	}

	if (!mobilePushNotifications) {
		if (settings.get('Accounts_Default_User_Preferences_mobileNotifications') === 'all' && (!isThread || hasReplyToThread)) {
			return true;
		}
		if (settings.get('Accounts_Default_User_Preferences_mobileNotifications') === 'nothing') {
			return false;
		}
	}

	return (roomType === 'd' || (!disableAllMessageNotifications && hasMentionToAll) || isHighlighted || mobilePushNotifications === 'all' || hasMentionToUser) && (!isThread || hasReplyToThread);
}
