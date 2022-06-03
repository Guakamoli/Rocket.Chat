import { HTTP } from 'meteor/http';

import { NotificationsModule } from '../../../../server/modules/notifications/notifications.module';

const FINANCIAL_SERVICE_URL = process.env.FINANCIAL_SERVICE_URL || 'http://financial-svc.develop:8080';

const httpGet = (url: string, options?: any): any => {
	let content: any = {};
	try {
		const response = HTTP.get(url, { ...options });
		if (!(response.statusCode !== 200 || !response.content)) {
			content = JSON.parse(response.content);
		}
	} catch (err: any) {
		console.error('httpGet request error:', err);
	}

	return content;
};

export function notifyUserTaskPoint(notifications: NotificationsModule, userId: string): void {
	const eventArgs: { point?: number } = { };
	const url = new URL(`/api/v1/point/${ userId }/daily-income`, FINANCIAL_SERVICE_URL);
	const { data = {} } = httpGet(url.toString());
	if ('point' in data) {
		eventArgs.point = data.point;
	}
	notifications.notifyUserInThisInstance(userId, 'taskPoint', eventArgs);
}
