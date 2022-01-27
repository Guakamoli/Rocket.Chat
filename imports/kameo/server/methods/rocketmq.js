import { Meteor } from 'meteor/meteor';
import MQHttpSDK from '@aliyunmq/mq-http-sdk';

import { Users } from '../../../../app/models';
import { Logger } from '../../../../app/logger';

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
	for await (const { uid, request } of notifications) {
		if (uid === 'rocket.cat') {
			continue;
		}

		const payload = { ...request, targetValue: uid };

		logger.debug('SendAliyunPush', payload);
		await rocketmqSend(topicIds.aliyunPush, JSON.stringify(payload), tag, 'rocketchat');
	}
}

async function rocketmqSendChangeRole(userId, payload, tag = 'mqRole') {
	const props = {
		id: userId,
	};
	logger.debug('SendChangeCreator', { ...payload });
	await rocketmqSend(topicIds.creatorRole, JSON.stringify({ ...payload }), tag, 'rocketchat', props);
}

Meteor.methods({
	kameoRocketmqSend: rocketmqSend,
	kameoRocketmqSendLoginUser: rocketmqSendLoginUser,
	kameoRocketmqSendPostMessage: rocketmqSendPostMessage,
	kameoRocketmqSendNotification: rocketmqSendNotification,
	kameoRocketmqSendUpdateProfile: rocketmqSendUpdateProfile,
	kameoRocketmqSendAliyunPush: rocketmqSendAliyunPush,
	kameoRocketmqSendChangeRole: rocketmqSendChangeRole,
});
