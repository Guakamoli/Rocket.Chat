/**
 * Login with a phone number and verification code.
 * @param phone The phone number.
 * @param code The verification code.
 * @param [callback]
 */
Meteor.loginWithKameoSms = function(phone, code, callback) {
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
Meteor.sendKameoCode = function(phone, callback) {
  Meteor.call('kameo-sms.sendCode', phone, callback);
};
