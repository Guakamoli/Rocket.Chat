import { check } from 'meteor/check';

import { API } from '../../../../../app/api/server/api';
import { notify } from '../../functions/revo';

const SECRET = process.env.INTERNAL_X_SECRET || '';

API.v1.addRoute('revo.notify', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			userId: String,
			eventName: String,
			eventData: Object,
		});

		notify(this.bodyParams);

		return API.v1.success();
	},
});
