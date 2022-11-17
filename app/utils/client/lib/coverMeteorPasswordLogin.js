import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

const reportError = (error, callback) => {
	if (callback) {
		callback(error);
	} else {
		throw error;
	}
};

const internalLoginWithPassword = ({ selector, password, code, recaptchaToken, callback }) => {
	if (typeof selector === 'string') {
		if (!selector.includes('@')) { selector = { username: selector }; } else { selector = { email: selector }; }
	}
	Accounts.callLoginMethod({
		methodArguments: [
			{
				user: selector,
				recaptchaToken,
				password: Accounts._hashPassword(password),
				code,
			},
		],
		userCallback: (error) => {
			if (error) {
				reportError(error, callback);
			} else {
				callback && callback();
			}
		},
	});
	return selector;
};

Meteor.loginWithPassword = (selector, password, recaptchaToken, callback) => internalLoginWithPassword({ selector, password, recaptchaToken, callback });
