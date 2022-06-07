import notifications from '../../../../app/notifications/server/lib/Notifications';

type EventBase = {
	t: 'point';
};

type EventPoint = EventBase & {
	point?: number;
};

export function notify(userId: string, eventData: EventPoint): void {
	notifications.notifyUserInThisInstance(userId, 'userCustom', eventData);
}

export function notifyPoint(userId: string, point?: number): void {
	notify(userId, { t: 'point', point });
}
