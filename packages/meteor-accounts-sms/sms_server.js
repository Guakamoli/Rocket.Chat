/* eslint-disable no-undef */
const SMSClient = Npm.require('@alicloud/sms-sdk');

const MATCH_PHONE_NUMBER = /^(\+?86)?1[3-9]\d{9}$/;

const NonEmptyString = Match.Where((str) => {
	check(str, String);
	return str.length > 0;
});

Meteor.methods({
	kameoSendCode: (phone) => {
		check(
			phone,
			{
				phoneNumber: String,
				countryCode: String,
			},
		);
		return Accounts.kameoSms.sendCode(phone);
	},
});

// Handler to login with a phone number and code.

Accounts.registerLoginHandler('kameoSms', function(options) {
	if (!options.kameoSms) {
		return;
	}

	check(options, {
		kameoSms: true,
		phone: Match.OneOf(
			{
				phoneNumber: String,
				countryCode: String,
			},
			String,
		),
		username: Match.Optional(String),
		verificationCode: Match.Optional(NonEmptyString),
	});
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

Accounts.kameoSms.configure = function(options) {
	check(
		options,
		Match.OneOf(
			{
				aliyun: {
					accessKeyId: String,
					secretAccessKey: String,
					signName: String,
					templateCode: String,
				},
				env: String,
				productCode: String,
			},
		),
	);
	if (options.aliyun) {
		Accounts.kameoSms.client = new SMSClient({
			accessKeyId: options.aliyun.accessKeyId,
			secretAccessKey: options.aliyun.secretAccessKey,
		});
		Accounts.kameoSms.params = {
			signName: options.aliyun.signName,
			templateCode: options.aliyun.templateCode,
		};
		Accounts.kameoSms.env = options.env;
	}
};

/**
 * @method sendSMSService
 * @param {String} phoneNumber - is user phone number
 * @param {Object} templateParam - use args
 * @returns {Object} this sms response
 */
async function sendSMSService(phoneNumber, templateParam) {
	return Accounts.kameoSms.client.sendSMS({
		PhoneNumbers: phoneNumber,
		SignName: Accounts.kameoSms.params.signName,
		TemplateCode: Accounts.kameoSms.params.templateCode,
		TemplateParam: templateParam,
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
	if (Accounts.kameoSms.env === 'production') {
		try {
			const modifier = {
				$push: {
					'services.sms.verificationCodes': {
						code: verificationCode,
						when: new Date(),
					},
				},
			};
			Meteor.users.update({ _id: userId }, modifier);
			await sendSMSService(
				`${ countryCode }${ phoneNumber }`,
				JSON.stringify({ code: verificationCode }),
			);
			console.log(`send sms success ${ countryCode }${ phoneNumber }`);
		} catch (err) {
			if (err.message.includes('invalid mobile number')) {
				throw new Meteor.Error('Incorrect number format');
			}
			if (err.message.includes('触发分钟级流控Permits:1')) {
				throw new Meteor.Error('Minute limit');
			}
			throw new Meteor.Error(err.error);
		}
	} else {
		const modifier = {
			$push: {
				'services.sms.verificationCodes': {
					code: '111111',
					when: new Date(),
				},
			},
		};
		Meteor.users.update({ _id: userId }, modifier);
	}
}

/**
 * @name insertUser
 * @param data -
 * @return {string}
 */
function insertUser(data) {
	const { phoneNumber, countryCode } = data;
	const userId = Random.id();

	const user = Meteor.users.findOne({ 'services.sms.realPhoneNumber': `${ countryCode }${ phoneNumber }` });
	if (user) {
		if (!user.active) {
			throw new Meteor.Error('Problematic user', 'Problematic user');
		}
		return user._id;
	}

	const newUser = {
		_id: userId,
		createdAt: new Date(),
		services: {
			sms: {
				realPhoneNumber: `${ countryCode }${ phoneNumber }`,
				purePhoneNumber: String(phoneNumber),
				countryCode,
				verificationCodes: [],
			},
		},
		emails: [],
		type: 'user',
		roles: [
			'user',
		],
	};
	Accounts.insertUserDoc({}, newUser);

	Meteor.runAsUser(userId, () => {
		const username = Meteor.call('getUsernameSuggestion');
		Meteor.users.update({ _id: userId }, {
			$set: {
				name: username,
				username,
				withSetUsername: true,
			},
		});
	});

	return userId;
}

/**
 * Send a 4 digit verification sms with twilio.
 * @param phone
 */

Accounts.kameoSms.sendCode = async function(phone) {
	if (!Accounts.kameoSms.client) {
		throw new Meteor.Error('accounts-sms has not been configured');
	}
	const verificationCode = Math.random().toString().slice(2, 8); // 去除整数位与小数点
	const { phoneNumber, countryCode: regionCode } = phone;
	const countryCode = `+${ regionCode }`;
	let userId;
	const user = Meteor.users.findOne({
		'services.sms.realPhoneNumber': phone,
	});
	userId = user && user._id;
	if (!user) {
		userId = insertUser({ phoneNumber, countryCode });
	}
	if (user && !user.active) {
		throw new Meteor.Error('Problematic user', 'Problematic user');
	}
	if (!MATCH_PHONE_NUMBER.test(`${ countryCode }${ phoneNumber }`)) {
		throw new Meteor.Error('Incorrect number format');
	}
	await sendSms({ userId, phoneNumber, verificationCode, countryCode });
};

/**
 * Send a 6 digit verification sms with aliyun or twilio.
 * @param phone
 * @param code
 */
Accounts.kameoSms.verifyCode = function(phone, code) {
	const { phoneNumber, countryCode: regionCode } = phone;
	const countryCode = `+${ regionCode }`;
	const modifier = {
		'services.sms.verificationCodes': [],
	};
	const user = Meteor.users.findOne({ 'services.sms.realPhoneNumber': `${ countryCode }${ phoneNumber }` });
	if (!user) {
		throw new Meteor.Error('Invalid phone number');
	}
	if (!user.services || !user.services.sms || user.services.sms.verificationCodes.length < 1) {
		throw new Meteor.Error('Invalid verification code');
	}
	// 校验验证码
	const verificationCode = user.services.sms.verificationCodes.pop();
	if (verificationCode.code !== code) {
		throw new Meteor.Error('Invalid verification code');
	}

	if (verificationCode.when.getTime() + 10 * 60 * 1000 < new Date()) {
		throw new Meteor.Error('Expired verification code');
	}

	if (!('active' in user)) {
		modifier.active = true;
	}

	// 删除验证码
	Accounts.users.update({ _id: user._id }, {
		$set: {
			...modifier,
		},
	});

	return { userId: user._id };
};
