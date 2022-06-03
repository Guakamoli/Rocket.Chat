import { check } from 'meteor/check';

import { API } from '../../../../../app/api/server/api';
import notifications from '../../../../../app/notifications/server/lib/Notifications';
import { notifyUserTaskPoint } from '../../functions/taskPoint';

const SECRET = process.env.INTERNAL_X_SECRET || '';

API.v1.addRoute('user.notifyUserTaskPoint', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			userId: String,
		});

		notifyUserTaskPoint(notifications, this.bodyParams.userId);

		return API.v1.success();
	},
});
