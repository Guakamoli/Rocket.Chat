import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Match, check } from 'meteor/check';

import { recaptchaSiteVerify } from '../utils/recaptchaSiteVerify';

Meteor.methods({
	kameoSendCode: (phone) => {
		check(
			phone,
			{
				phoneNumber: String,
				countryCode: String,
				recaptchaToken: Match.Maybe(String),

			},
		);
		const { recaptchaToken } = phone;
		try {
			delete phone.recaptchaToken;
		} catch (e) {
			console.info(e, 'kameoSendCode');
		}
		recaptchaSiteVerify(recaptchaToken);
		return Accounts.kameoSms.sendCode(phone);
	},
});
