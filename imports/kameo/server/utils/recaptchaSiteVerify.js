import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { settings } from '../../../../app/settings/index.js';

export const recaptchaSiteVerify = (token) => {
	const EnableRecaptcha = settings.get('Accounts_Recaptcha_Enable');
	const secret = settings.get('Accounts_Recaptcha_Secret');
	const domain = settings.get('Accounts_Recaptcha_Domain');
	const mandatory = settings.get('Accounts_Recaptcha_Mandatory');
	const version = settings.get('Accounts_Recaptcha_Version');
	const threshold = settings.get('Accounts_Recaptcha_Score_Threshold'); // v3版本有效

	if (!EnableRecaptcha || !secret || !domain) {
		return true;
	}
	if (!mandatory && !token) {
		// 没有强制要求, 没有token 的直接返回true, 有提供token 就继续走token
		return true;
	}
	const response = HTTP.post(`${ domain }/recaptcha/api/siteverify`, {
		params: {
			secret,
			response: token,
		},
	});
	if (!response?.data?.success) {
		throw new Meteor.Error('Rechaptcha error', 'Rechaptcha_error');
	}
	if (version === 'v3') {
		if (!response?.data?.score || parseInt(response?.data?.score * 100) < parseInt(threshold)) {
			throw new Meteor.Error('Rechaptcha error', 'Rechaptcha_error');
		}
	}
};
