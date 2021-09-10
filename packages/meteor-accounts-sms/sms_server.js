// eslint-disable-next-line no-undef
const Twilio = Npm.require('twilio');
// eslint-disable-next-line no-undef
const SMSClient = Npm.require('@alicloud/sms-sdk');

// eslint-disable-next-line no-undef
const NonEmptyString = Match.Where((str) => {
	// eslint-disable-next-line no-undef
	check(str, String);
	return str.length > 0;
});

// eslint-disable-next-line no-undef
Meteor.methods({
	'kameo-sms.sendCode'(phone) {
		// eslint-disable-next-line no-undef
		check(
			phone,
			// eslint-disable-next-line no-undef
			Match.OneOf(
				{
					phoneNumber: String,
					countryCode: String,
				},
				String,
			),
		);

		// eslint-disable-next-line no-undef
		return Accounts.kameoSms.sendCode(phone);
	},
});

// Handler to login with a phone number and code.
// eslint-disable-next-line no-undef
Accounts.registerLoginHandler('kameoSms', function(options) {
	if (!options.kameoSms) {
		return;
	}

	// eslint-disable-next-line no-undef
	check(options, {
		kameoSms: true,
		// eslint-disable-next-line no-undef
		phone: Match.OneOf(
			{
				phoneNumber: String,
				countryCode: String,
			},
			String,
		),
		// eslint-disable-next-line no-undef
		verificationCode: Match.Optional(NonEmptyString),
	});

	// eslint-disable-next-line no-undef
	return Accounts.kameoSms.verifyCode(options.phone, options.verificationCode);
});

/**
 * You can set the twilio from, sid and key and this
 * will handle sending and verifying sms with twilio.
 * Or you can configure sendVerificationSms and verifySms helpers manually.
 * @param options
 * @param [options.twilio]
 * @param {String} options.twilio.from The phone number to send sms from.
 * @param {String} options.twilio.sid The twilio sid to use to send sms.
 * @param {String} options.twilio.token The twilio token to use to send sms.
 * @param {Function} [options.sendVerificationCode] (phone)
 * Given a phone number, send a verification code.
 * @param {Function} [options.verifyCode] (phone, code)
 * Given a phone number and verification code return the { userId: '' }
 * to log that user in or throw an error.
 */
// eslint-disable-next-line no-undef
Accounts.kameoSms.configure = function(options) {
	// eslint-disable-next-line no-undef
	check(
		options,
		// eslint-disable-next-line no-undef
		Match.OneOf(
			{
				aliyun: {
					accessKeyId: String,
					secretAccessKey: String,
					signName: String,
					templateCode: String,
				},
				env: String,
			},
			{
				twilio: {
					sid: String,
					token: String,
					from: String,
				},
			},
		),
	);
	if (options.aliyun) {
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.client = new SMSClient({
			accessKeyId: options.aliyun.accessKeyId,
			secretAccessKey: options.aliyun.secretAccessKey,
		});
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.params = {
			signName: options.aliyun.signName,
			templateCode: options.aliyun.templateCode,
			productCode: 'PAIYA',
		};
	} else if (options.twilio) {
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.client = new Twilio({
			sid: options.twilio.sid,
			token: options.twilio.token,
		});
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.params = { productCode: 'GODUCK', from: options.twilio.from };
	} else {
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.env = options.env;
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.sendVerificationCode = options.sendVerificationCode;
		// eslint-disable-next-line no-undef
		Accounts.kameoSms.verifyCode = options.verifyCode;
	}
};

/**
 * @method sendSMSService
 * @param {String} phoneNumber - is user phone number
 * @param {Object} templateParam - use args
 * @returns {Object} this sms response
 */
async function sendSMSService(phoneNumber, templateParam) {
	// eslint-disable-next-line no-undef
	return Accounts.kameoSms.client.sendSMS({
		PhoneNumbers: phoneNumber,
		// eslint-disable-next-line no-undef
		SignName: Accounts.kameoSms.params.signName,
		// eslint-disable-next-line no-undef
		TemplateCode: Accounts.kameoSms.params.templateCode,
		TemplateParam: templateParam,
	});
}

/**
 * sendGoDuckSms
 * @param{String} phoneNumber The phoneNumber
 * @param{String} verificationCode The code
 *  @returns {void}
 */
async function sendGoDuckSms(phoneNumber, verificationCode) {
	// eslint-disable-next-line no-undef
	await Accounts.kameoSms.client.messages.create({
		body: `GoDuck: Your verification code is ${ verificationCode }. Please fill it in within 10 minutes. `,
		// eslint-disable-next-line no-undef
		from: Accounts.kameoSms.params.from,
		to: phoneNumber,
	});
}

/**
 * send sms
 * @param{Object} send sms input param
 * @param{String} userId The user id
 * @param{String} phoneNumber The phoneNumber
 * @param{String} verificationCode The verificationCode
 * @param{String} countryCode The regionCode
 *  @returns {Object} this phoneNumber and regionCode
 */
async function sendSms({ userId, phoneNumber, verificationCode, countryCode }) {
	// eslint-disable-next-line no-undef
	if (Accounts.kameoSms.env !== 'development') {
		try {
			// eslint-disable-next-line no-undef
			Accounts.users.setVerificationCodes(userId, verificationCode);
			// eslint-disable-next-line no-undef
			if (Accounts.kameoSms.params.productCode === 'GODUCK') {
				await sendGoDuckSms(`${ countryCode }${ phoneNumber }`, verificationCode);
			} else {
				await sendSMSService(
					`${ countryCode }${ phoneNumber }`,
					`{"code": ${ verificationCode }}`,
				);
			}
			console.log(`send sms success ${ countryCode }${ phoneNumber }`);
		} catch (err) {
			if (err.message.includes('invalid mobile number')) {
				// eslint-disable-next-line no-undef
				throw new Meteor.Error('Incorrect number format');
			}
			if (err.message.includes('触发分钟级流控Permits:1')) {
				// eslint-disable-next-line no-undef
				throw new Meteor.Error('Minute limit');
			}
			// eslint-disable-next-line no-undef
			throw new Meteor.Error('send faild!');
		}
	} else {
		// eslint-disable-next-line no-undef
		Accounts.users.setVerificationCodes(userId, '111111');
	}
}

/**
 * Send a 4 digit verification sms with twilio.
 * @param phone
 */
// eslint-disable-next-line no-undef
Accounts.kameoSms.sendCode = async function(phone) {
	// eslint-disable-next-line no-undef
	if (!Accounts.kameoSms.client) {
		// eslint-disable-next-line no-undef
		throw new Meteor.Error('accounts-sms has not been configured');
	}
	const verificationCode = Math.random().toString().slice(-6);
	const { phoneNumber, countryCode: regionCode } = phone;
	const countryCode = `+${ regionCode }`;
	let userId;
	// eslint-disable-next-line no-undef
	const user = await Meteor.users.findOne({
		'services.sms.realPhoneNumber': phone,
	});
	userId = user && user._id;
	if (!user) {
		// 创建用户
		// userId = Meteor.call('registerSmsUser', { phoneNumber, countryCode });
		// userId = Meteor.call('registerSmsUser', { phoneNumber, countryCode });
		// eslint-disable-next-line no-undef
		userId = Meteor.call('registerSmsUser', { phoneNumber, countryCode });
	}
	// 暂时不做电话长度校验
	await sendSms({ userId, phoneNumber, verificationCode, countryCode });
};

/**
 * Send a 6 digit verification sms with aliyun or twilio.
 * @param phone
 * @param code
 */
// eslint-disable-next-line no-undef
Accounts.kameoSms.verifyCode = function(phone, code) {
	// eslint-disable-next-line no-undef
	const user = Meteor.users.findOne({ 'services.sms.realPhoneNumber': phone });
	if (!user) {
		// eslint-disable-next-line no-undef
		throw new Meteor.Error('Invalid phone number');
	}
	if (!user.services || !user.services.sms || user.services.sms.verificationCodes.length < 1) {
		// eslint-disable-next-line no-undef
		throw new Meteor.Error('Invalid verification code');
	}
	// 校验验证码
	const verificationCode = user.services.sms.verificationCodes.pop();
	if (verificationCode.when.getTime() + 10 * 60 * 1000 < new Date()) {
		// eslint-disable-next-line no-undef
		throw new Meteor.Error('Expired verification code');
	}

	if (verificationCode.code !== code) {
		// eslint-disable-next-line no-undef
		throw new Meteor.Error('Expired verification code');
	}

	// 删除验证码
	// eslint-disable-next-line no-undef
	Accounts.users.removeVerificationCodes(user._id);
	const loginToken = user.services.resume.loginTokens.pop();

	return { userId: user._id, loginToken: loginToken.hashedToken };
};
