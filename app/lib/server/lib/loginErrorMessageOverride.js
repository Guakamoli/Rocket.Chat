// Do not disclose if user exists when password is invalid
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import { settings } from '../../../settings';
import { recaptchaSiteVerify } from '../../../../imports/kameo/server/utils/recaptchaSiteVerify';

const { _runLoginHandlers } = Accounts;
Accounts._runLoginHandlers = function(methodInvocation, options) {
	const { recaptchaToken } = options;
	try {
		delete options.recaptchaToken;
	} catch (e) {
		console.info(e, '_runLoginHandlers');
	}
	const result = _runLoginHandlers.call(Accounts, methodInvocation, options);

	if (options.password) {
		const secret = settings.get('Accounts_Recaptcha_Secret');
		const EnableRecaptcha = settings.get('Accounts_EnableRecaptcha');
		if (EnableRecaptcha && secret) {
			recaptchaSiteVerify(recaptchaToken);
		}
	}

	if (result.error && result.error.reason === 'Incorrect password') {
		result.error = new Meteor.Error(403, 'User not found');
	}

	return result;
};
