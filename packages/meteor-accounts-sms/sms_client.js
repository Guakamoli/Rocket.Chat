/**
 * Login with a phone number and verification code.
 * @param phone The phone number.
 * @param code The verification code.
 * @param [callback]
 */
// eslint-disable-next-line no-undef
Meteor.loginWithKameoSms = function(phone, code, callback) {
	// eslint-disable-next-line no-undef
	Accounts.callLoginMethod({
		methodArguments: [{
			kameoSms: true,
			phone,
			verificationCode: code,
		}],
		userCallback: callback,
	});
};

/**
 * Request a verification code.
 * @param phone The phone number to verify.
 * @param [callback]
 */
// eslint-disable-next-line no-undef
Meteor.sendKameoCode = function(phone, callback) {
	// eslint-disable-next-line no-undef
	Meteor.call('kameo-sms.sendCode', phone, callback);
};
