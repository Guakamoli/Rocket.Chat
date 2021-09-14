/* eslint-disable no-undef */
/**
 * Login with a phone number and verification code.
 * @param phone The phone number.
 * @param code The verification code.
 * @param [callback]
 */
Meteor.loginWithKameoSms = function(phone, code, validateResult, callback) {
	Accounts.callLoginMethod({
		methodArguments: [{
			kameoSms: true,
			phone,
			verificationCode: code,
		}],
		validateResult: (result) => validateResult(result),
		userCallback: callback,
	});
};

/**
 * Request a verification code.
 * @param phone The phone number to verify.
 * @param [callback]
 */
Meteor.sendKameoCode = function(phone, callback) {
	Meteor.call('sendCode', phone, callback);
};
