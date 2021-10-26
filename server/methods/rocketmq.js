import { Meteor } from 'meteor/meteor';
import MQHttpSDK from '@aliyunmq/mq-http-sdk';

import { Users } from '../../app/models';

const { MQClient, MessageProperties } = MQHttpSDK;

const accessKeyId = process.env.MQ_ACCESS_KEY_ID;
const accessKeySecret = process.env.MQ_ACCESS_KEY_SECRET;
const endpoint = process.env.MQ_ENDPOINT;
const instanceId = process.env.MQ_INSTANCE_ID;
// const topic = {
// 	rocketchat: process.env.MQ_TOPIC_ID_ROCKETCHAT,
// 	rocketpost: process.env.MQ_TOPIC_ID_ROCKETPOST,
// };

const mqClient = new MQClient(endpoint, accessKeyId, accessKeySecret);

async function publishMessage(producer, body, tag, props) {
	await producer.publishMessage(JSON.stringify(body), tag, props);
}

function genRocketmqMsgProps(key, props) {
	const msgProps = new MessageProperties();
	Object.keys(props).forEach((prop) => {
		msgProps.putProperty(prop, props[prop]);
	});
	msgProps.messageKey(key);
	return msgProps;
}

async function rocketmqSend(topicId, body, tag, props = {}, retry) {
	const producer = mqClient.getProducer(instanceId, topicId);
	let msgProps = new MessageProperties();
	if (props) {
		msgProps = genRocketmqMsgProps('messageKey', props);
	}

	try {
		// console.time('rocketmq-done');
		await publishMessage(producer, body, tag, msgProps);
		// console.timeEnd('rocketmq-done');
	} catch (error) {
		if (retry > 2) {
			console.log('重试次数已结束', error);
			return;
		}
		retry++;
		console.log('小贤贤----------------rocketmqSend---------', error);
		// 消息发送失败，需要进行重试处理，可重新发送这条消息或持久化这条数据进行补偿处理。
		Meteor.call('rocketmqSend', topicId, body, msgProps, tag);
	}
}

async function rocketmqSendLoginUser(userId) {
	const user = Users.findOneById(userId);
	await rocketmqSend(process.env.MQ_TOPIC_ID_ROCKETCHAT, user, 'mqLoginUser', { id: userId }, 3);
}

// async function rocketmqSendPostMessage(message) {
// 	console.log(message, '-----------------------------------rocketmqSend---------------------');
// 	if (!message) { return; }
// 	await rocketmqSend(process.env.MQ_TOPIC_ID_ROCKETPOST, message, 'mqPostMessage');
// }

Meteor.methods({
	rocketmqSend,
	rocketmqSendLoginUser,
	genRocketmqMsgProps,
	// rocketmqSendPostMessage,
});
