import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';

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
		delete phone.recaptchaToken;
		if (Accounts.kameoSms.env === 'production') {
			recaptchaSiteVerify(recaptchaToken);
		}

		return Accounts.kameoSms.sendCode(phone);
	},
});
