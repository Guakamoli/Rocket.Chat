import { Match, check } from 'meteor/check';

import { API } from '../../../../../app/api/server/api';
import { notifyPoint } from '../../functions/revo';

const SECRET = process.env.INTERNAL_X_SECRET || '';

API.v1.addRoute('revo.notifyPoint', { authRequired: false }, {
	post() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		check(this.bodyParams, {
			userId: String,
			point: Match.Optional(Number),
		});

		notifyPoint(this.bodyParams.userId, this.bodyParams?.point);

		return API.v1.success();
	},
});
