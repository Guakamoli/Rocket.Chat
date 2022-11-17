import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { settings } from '../../../../app/settings/index.js';

export const recaptchaSiteVerify = (token) => {
	const EnableRecaptcha = settings.get('Accounts_EnableRecaptcha');
	const secret = settings.get('Accounts_Recaptcha_Secret');
	if (!EnableRecaptcha || !secret) {
		return true;
	}
	const response = HTTP.post('https://www.recaptcha.net/recaptcha/api/siteverify', {
		params: {
			secret,
			response: token,
		},
	});
	if (!response?.data?.success) {
		throw new Meteor.Error('Rechaptcha error', 'Rechaptcha_error');
	}
};
