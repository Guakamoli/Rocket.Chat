import { callbacks } from '../../app/callbacks/server';
import { NotificationQueue, Subscriptions } from '../../app/models/server/raw';
import { IReadLs } from '../../definition/ISubscription';

export async function markRoomAsRead(rid: string, uid: string, t?: string): Promise<void> {
	callbacks.run('beforeReadMessages', rid, uid);

	const projection = { ls: 1, tunread: 1, alert: 1 };
	const sub = await Subscriptions.findOneByRoomIdAndUserId(rid, uid, { projection });
	if (!sub) {
		throw new Error('error-invalid-subscription');
	}

	// do not mark room as read if there are still unread threads
	const alert = sub.alert && sub.tunread && sub.tunread.length > 0;
	const updateFiled: IReadLs = {};
	if (t === 'story') {
		updateFiled.storyLs = new Date();
	} else {
		updateFiled.ls = new Date();
	}
	await Subscriptions.setAsReadByRoomIdAndUserId(rid, uid, alert, updateFiled);

	await NotificationQueue.clearQueueByUserId(uid);

	callbacks.runAsync('afterReadMessages', rid, { uid, lastSeen: sub.ls });
}
