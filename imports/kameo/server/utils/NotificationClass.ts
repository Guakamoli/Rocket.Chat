import { Meteor } from 'meteor/meteor';
import EJSON from 'ejson';

import { INotification, INotificationItemPush, INotificationItemEmail, NotificationItem } from '../../../../definition/INotification';
import { NotificationQueue, Users } from '../../../../app/models/server/raw';
import { sendEmailFromData } from '../../../../app/lib/server/functions/notifications/email';
// import { PushNotification } from '../../../../app/push-notifications/server';
import { IUser } from '../../../../definition/IUser';
import { settings } from '../../../../app/settings/server';
import { metrics } from '../../../../app/metrics/server';
import { currentProduct } from './index';
import { IAliyunPushRequest, IAliyunPushNotification } from '../definition/IAliyun';

const {
	NOTIFICATIONS_WORKER_TIMEOUT = 2000,
	NOTIFICATIONS_BATCH_SIZE = 100,
	NOTIFICATIONS_SCHEDULE_DELAY_ONLINE = 120,
	NOTIFICATIONS_SCHEDULE_DELAY_AWAY = 0,
	NOTIFICATIONS_SCHEDULE_DELAY_OFFLINE = 0,
} = process.env;

export default class NotificationClass {
	private running = false;

	private cyclePause = Number(NOTIFICATIONS_WORKER_TIMEOUT);

	private maxBatchSize = Number(NOTIFICATIONS_BATCH_SIZE);

	private maxScheduleDelaySeconds: {[key: string]: number} = {
		online: Number(NOTIFICATIONS_SCHEDULE_DELAY_ONLINE),
		away: Number(NOTIFICATIONS_SCHEDULE_DELAY_AWAY),
		offline: Number(NOTIFICATIONS_SCHEDULE_DELAY_OFFLINE),
	};

	initWorker(): void {
		this.running = true;
		this.executeWorkerLater();
	}

	stopWorker(): void {
		this.running = false;
	}

	executeWorkerLater(): void {
		if (!this.running) {
			return;
		}

		setTimeout(() => {
			try {
				this.worker();
			} catch (e) {
				console.error('Error sending notification', e);
				this.executeWorkerLater();
			}
		}, this.cyclePause);
	}

	async worker(counter = 0): Promise<void> {
		const notification = await this.getNextNotification();

		if (!notification) {
			return this.executeWorkerLater();
		}

		// Once we start notifying the user we anticipate all the schedules
		const flush = await NotificationQueue.clearScheduleByUserId(notification.uid);

		// start worker again it queue flushed
		if (flush.modifiedCount) {
			await NotificationQueue.unsetSendingById(notification._id);
			return this.worker(counter);
		}

		try {
			for (const item of notification.items) {
				switch (item.type) {
					case 'push':
						this.push(notification, item);
						break;
					case 'email':
						this.email(item);
						break;
				}
			}

			NotificationQueue.removeById(notification._id);
		} catch (e) {
			console.error(e);
			await NotificationQueue.setErrorById(notification._id, e.message);
		}

		if (counter >= this.maxBatchSize) {
			return this.executeWorkerLater();
		}
		this.worker(counter++);
	}

	getNextNotification(): Promise<INotification | undefined> {
		const expired = new Date();
		expired.setMinutes(expired.getMinutes() - 5);

		return NotificationQueue.findNextInQueueOrExpired(expired);
	}

	push({ uid }: INotification, item: INotificationItemPush): void {
		const { roomName, username, message, payload, badge = 1, category } = item.data;

		if (uid === 'rocket.cat' || payload.messageType !== 'activity') {
			return;
		}

		const idOnly = settings.get('Push_request_content_from_server');
		const title = idOnly ? '' : payload.sender.name || username || roomName;

		const iOSAppKey = currentProduct({
			PAIYA: Number(process.env.MPUSH_APPKEY_PAIYA_IOS),
			GODUCK: Number(process.env.MPUSH_APPKEY_GODUCK_IOS),
		});
		const iOSRequest: IAliyunPushRequest = {
			pushType: 'NOTICE',
			appKey: iOSAppKey,
			deviceType: 'iOS',
			target: 'ACCOUNT',
			iOSApnsEnv: process.env.NODE_ENV === 'production' ? 'PRODUCT' : 'DEV',
			iOSMutableContent: true,
			iOSBadge: badge,
			body: message,
		};
		iOSRequest.iOSExtParameters = JSON.stringify({ ejson: EJSON.stringify(payload) });
		if (title) {
			iOSRequest.title = title;
		}
		if (category) {
			iOSRequest.iOSNotificationCategory = category;
		}

		const currentDate = new Date();
		currentDate.setHours(currentDate.getHours() + 72); // 72小时后过期
		const expireTime = currentDate.toISOString().replace(/\.[0-9]{3}/, '');

		const androidAppKey = currentProduct({
			PAIYA: Number(process.env.MPUSH_APPKEY_PAIYA_ANDROID),
			GODUCK: Number(process.env.MPUSH_APPKEY_GODUCK_ANDROID),
		});
		const androidRequest: IAliyunPushRequest = {
			pushType: 'NOTICE',
			appKey: androidAppKey,
			deviceType: 'ANDROID',
			target: 'ACCOUNT',
			androidNotificationChannel: '1',
			body: message,
			androidNotifyType: 'BOTH',
			androidPopupBody: message,
			androidNotificationBarPriority: 0,
			androidRemind: false,
			storeOffline: true,
			expireTime,
		};
		if (title) {
			androidRequest.title = title;
		} else {
			androidRequest.title = currentProduct({
				PAIYA: '拍鸭',
				GODUCK: 'Torimi',
			});
		}
		androidRequest.androidPopupTitle = title;
		androidRequest.androidExtParameters = JSON.stringify({ ejson: EJSON.stringify(payload) });

		// eslint-disable-next-line @typescript-eslint/camelcase
		metrics.notificationsSent.inc({ notification_type: 'mobile' });

		const notifications: IAliyunPushNotification[] = [{ uid, request: iOSRequest }, { uid, request: androidRequest }];
		Meteor.call('kameoRocketmqSendAliyunPush', 'notification', ...notifications);
	}

	email(item: INotificationItemEmail): void {
		sendEmailFromData(item.data);
	}

	async scheduleItem({ uid, rid, mid, items, user }: { uid: string; rid: string; mid: string; items: NotificationItem[]; user?: Partial<IUser> }): Promise<void> {
		const receiver = user || await Users.findOneById<Pick<IUser, 'statusConnection'>>(uid, {
			projection: {
				statusConnection: 1,
			},
		});

		if (!receiver) {
			return;
		}

		const { statusConnection = 'offline' } = receiver;

		let schedule: Date | undefined;

		const delay = this.maxScheduleDelaySeconds[statusConnection];

		if (delay < 0) {
			return;
		}
		if (delay > 0) {
			schedule = new Date();
			schedule.setSeconds(schedule.getSeconds() + delay);
		}

		await NotificationQueue.insertOne({
			uid,
			rid,
			mid,
			ts: new Date(),
			schedule,
			items,
		});
	}
}
