import notifications from '../../../../app/notifications/server/lib/Notifications';

type EventPoint = {
	dailyTotal: number;
	dailyPoint?: number;
};

type Event = {
	userId: string;
	eventName: 'wallet';
	eventData: EventPoint;
}

export function notify(event: Event): void {
	const { userId, eventName, eventData } = event;
	notifications.notifyUserInThisInstance(userId, eventName, eventData);
}
