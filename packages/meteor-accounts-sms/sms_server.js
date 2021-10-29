/* eslint-disable no-undef */
const Twilio = Npm.require('twilio');

const SMSClient = Npm.require('@alicloud/sms-sdk');

const NonEmptyString = Match.Where((str) => {
	check(str, String);
	return str.length > 0;
});

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
		verificationCode: Match.Optional(NonEmptyString),
	});

	return Accounts.kameoSms.verifyCode(options.phone, options.verificationCode);
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
			},
			{
				twilio: {
					sid: String,
					token: String,
					from: String,
				},
				env: String,
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
			productCode: 'PAIYA',
		};
		Accounts.kameoSms.env = options.env;
	} else if (options.twilio) {
		Accounts.kameoSms.client = new Twilio({
			sid: options.twilio.sid,
			token: options.twilio.token,
		});
		Accounts.kameoSms.params = { productCode: 'GODUCK', from: options.twilio.from };
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
 * sendGoDuckSms
 * @param{String} phoneNumber The phoneNumber
 * @param{String} verificationCode The code
 *  @returns {void}
 */
async function sendGoDuckSms(phoneNumber, verificationCode) {
	await Accounts.kameoSms.client.messages.create({
		body: `GoDuck: Your verification code is ${ verificationCode }. Please fill it in within 10 minutes. `,
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
	let user;

	user = Meteor.users.findOne({ 'services.sms.realPhoneNumber': `${ countryCode }${ phoneNumber }` });
	if (user) {
		return user._id;
	}

	user = {
		_id: userId,
		createdAt: new Date(),
		services: {
			sms: {
				realPhoneNumber: `${ countryCode }${ phoneNumber }`,
				purePhoneNumber: phoneNumber,
				countryCode,
				verificationCodes: [],
			},
		},
		username: userId,
		emails: [],
		type: 'user',
		roles: [
			'user',
		],
		name: `User${ phoneNumber.slice(-8) }`,
	};
	Accounts.users.insert(user);

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
	const verificationCode = Math.random().toString().slice(-6);
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
	// 暂时不做电话长度校验
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

	if (!user.active) {
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
