import { Meteor } from 'meteor/meteor';

import { recaptchaSiteVerify } from '../../../../imports/kameo/server/utils/recaptchaSiteVerify';

Meteor.kameoSendCode = function(phone, callback) {
	const { recaptchaToken } = phone;
	console.info('都导向这里了吗',recaptchaToken);
	try {
		delete phone.recaptchaToken;
	} catch (e) {
		console.info(e, 'kameoSendCode');
	}
	recaptchaSiteVerify(recaptchaToken);
	Meteor.call('kameoSendCode', phone, callback);
};
