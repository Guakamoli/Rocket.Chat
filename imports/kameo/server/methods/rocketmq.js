import { Meteor } from 'meteor/meteor';
import MQHttpSDK from '@aliyunmq/mq-http-sdk';

import { Users } from '../../../../app/models';
import { Logger } from '../../../../app/logger';
import { safeXML } from '../utils/index';

const logger = new Logger('RocketMQ', {});

const { MQClient, MessageProperties } = MQHttpSDK;

const accessKeyId = process.env.MQ_ACCESS_KEY_ID;
const accessKeySecret = process.env.MQ_ACCESS_KEY_SECRET;
const endpoint = process.env.MQ_ENDPOINT;
const instanceId = process.env.MQ_INSTANCE_ID;
const topicIds = {
	login: process.env.MQ_TOPIC_ID_ROCKETCHAT_LOGIN,
	postMessage: process.env.MQ_TOPIC_ID_ROCKETCHAT_POST_MESSAGE,
	notification: process.env.MQ_TOPIC_ID_ROCKETCHAT_NOTIFICATION,
	account: process.env.MQ_TOPIC_ID_ROCKETCHAT_ACCOUNT,
	aliyunPush: process.env.MQ_TOPIC_ID_ALIYUN_PUSH,
	creatorRole: process.env.MQ_TOPIC_ID_ROCKETCHAT_ROLE,
	blockedUser: process.env.MQ_TOPIC_ID_ROCKETCHAT_BLOCKED,
	invite: process.env.MQ_TOPIC_ID_DATA_INVITE,
	updateGorseUser: process.env.MQ_TOPIC_ID_GORSE,
};

const mqClient = new MQClient(endpoint, accessKeyId, accessKeySecret);

async function publishMessage(producer, body, tag, props) {
	await producer.publishMessage(body, tag, props);
}

function genRocketmqMsgProps(key, props) {
	const msgProps = new MessageProperties();
	Object.keys(props).forEach((prop) => {
		msgProps.putProperty(prop, props[prop]);
	});
	if (key) {
		msgProps.messageKey(key);
	}
	return msgProps;
}

async function rocketmqSend(topicId, body, tag, messageKey = '', props = {}, retry = 3) {
	logger.debug('Send', { topicId, body, tag, messageKey, props, retry: retry - 1 });
	const producer = mqClient.getProducer(instanceId, topicId);
	let msgProps = new MessageProperties();
	if (props) {
		msgProps = genRocketmqMsgProps(messageKey, props);
	}

	try {
		await publishMessage(producer, body, tag, msgProps);
	} catch (error) {
		if (retry > 0) {
			// 消息发送失败，需要进行重试处理，可重新发送这条消息或持久化这条数据进行补偿处理。
			logger.debug('Retry', { error, topicId, body, tag, messageKey, props, retry: retry - 1 });
			Meteor.call('kameoRocketmqSend', topicId, body, tag, messageKey, props, retry - 1);
		}
	}
}

async function rocketmqSendLoginUser(userId) {
	const user = Users.findOneById(userId);
	const props = {
		id: userId,
	};
	if (user.name) {
		user.name = safeXML(user.name);
	}
	if (user.bio) {
		user.bio = safeXML(user.bio);
	}
	if (user?.customFields?.note) {
		user.customFields.note = safeXML(user.customFields.note);
	}

	await rocketmqSend(topicIds.login, JSON.stringify({ ...user }), 'mqLoginUser', 'rocketchat', props);
}

async function rocketmqSendPostMessage(message) {
	await rocketmqSend(topicIds.postMessage, JSON.stringify({ ...message }), 'mqPostMessage', 'rocketchat');
}

async function rocketmqSendNotification(notification) {
	const props = {
		id: notification.postId,
	};

	await rocketmqSend(topicIds.notification, JSON.stringify({ ...notification }), 'mqNotification', 'rocketchat', props);
}

async function rocketmqSendUpdateProfile(userId, profile) {
	const props = {
		id: userId,
	};

	if (profile.username) {
		profile.picture = `${ process.env.ROOT_URL }/avatar/${ profile.username }#`;
	}

	await rocketmqSend(topicIds.account, JSON.stringify({ ...profile }), 'mqUpdateAccount', 'rocketchat', props);
}

async function rocketmqSendAliyunPush(tag = 'notification', ...notifications) {
	const results = [];
	for (const { uid, request } of notifications) {
		if (uid === 'rocket.cat') {
			continue;
		}

		const payload = { ...request, targetValue: uid };

		logger.debug('SendAliyunPush', payload);
		results.push(rocketmqSend(topicIds.aliyunPush, JSON.stringify(payload), tag, 'rocketchat'));
	}

	await Promise.all(results);
}

async function rocketmqSendChangeRole(userId, payload, tag = 'mqRole') {
	const props = {
		id: userId,
	};
	logger.debug('SendChangeCreator', { ...payload });
	await rocketmqSend(topicIds.creatorRole, JSON.stringify({ ...payload }), tag, 'rocketchat', props);
}

async function rocketmqSendBlocked(payload, tag = 'mqBlocked') {
	logger.debug('rocketmqSendBlocked', { ...payload });
	await rocketmqSend(topicIds.blockedUser, JSON.stringify({ ...payload }), tag, 'rocketchat');
}

async function rocketmqSendInvite(payload, tag = 'register') {
	logger.debug('rocketmqSendInvite', { ...payload });
	await rocketmqSend(topicIds.invite, JSON.stringify(payload), tag, 'rocketchat');
}

async function rocketmqSendGorseUser(payload, tag = 'user.update') {
	logger.debug('rocketmqSendGorseUser', { ...payload });
	const user = Users.findOneById(payload.userId);
	if (user?.region) {
		payload.labels.push(`region:${ user.region }`);
	}
	await rocketmqSend(topicIds.updateGorseUser, JSON.stringify(payload), tag, 'rocketchat');
}

Meteor.methods({
	kameoRocketmqSend: rocketmqSend,
	kameoRocketmqSendLoginUser: rocketmqSendLoginUser,
	kameoRocketmqSendPostMessage: rocketmqSendPostMessage,
	kameoRocketmqSendNotification: rocketmqSendNotification,
	kameoRocketmqSendUpdateProfile: rocketmqSendUpdateProfile,
	kameoRocketmqSendAliyunPush: rocketmqSendAliyunPush,
	kameoRocketmqSendChangeRole: rocketmqSendChangeRole,
	kameoRocketmqSendBlocked: rocketmqSendBlocked,
	kameoRocketmqSendInvite: rocketmqSendInvite,
	kameoRocketmqSendGorseUser: rocketmqSendGorseUser,
});
