import { Meteor } from 'meteor/meteor';
import MQHttpSDK from '@aliyunmq/mq-http-sdk';

const { MQClient, MessageProperties } = MQHttpSDK;

const accessKeyId = process.env.MQ_ACCESS_KEY_ID;
const accessKeySecret = process.env.MQ_ACCESS_KEY_SECRET;
const endpoint = process.env.MQ_ENDPOINT;
const instanceId = process.env.MQ_INSTANCE_ID;
const topicId_rocketchat = process.env.MQ_TOPIC_ID_ROCKETCHAT;

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

Meteor.methods({
	async rocketmqSend(body, tag, props) {
		const producer = mqClient.getProducer(instanceId, topicId_rocketchat);
		let msgProps = new MessageProperties();
		if (props) {
			msgProps = genRocketmqMsgProps('messageKey', props);
		}

		try {
			await publishMessage(producer, body, tag ?? '', msgProps);
		} catch (error) {
			// 消息发送失败，需要进行重试处理，可重新发送这条消息或持久化这条数据进行补偿处理。
			Meteor.call('rocketmqSend', body, tag ?? '', msgProps);
		}
	},
	genRocketmqMsgProps,
});

/**
const user = Accounts.findOne({ _id: id });
Meteor.call('rocketmqSend', user, 'mqLoginUser', { id });
 */
