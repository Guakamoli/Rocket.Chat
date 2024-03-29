import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';

import { WechatAPI, decodeAES128CBC } from '../utils/wechat';
import { Users } from '../../../../app/models';
import { defaultUsernameSuggestion } from '../../../../app/lib/server/functions/getUsernameSuggestion';

export const wechatCreateUser = (serviceName, serviceData, { tokenExpires, smsServiceData }) => {
	const newUser = {
		active: true,
		services: {
			[serviceName]: serviceData,
		},
		username: defaultUsernameSuggestion(),
		withSetUsername: true,
	};
	if (smsServiceData) {
		newUser.services.sms = smsServiceData;
	}
	const userId = Accounts.insertUserDoc({}, newUser);

	const { token } = Accounts._generateStampedLoginToken();

	return {
		type: serviceName,
		userId,
		token,
		tokenExpires,
	};
};

const WECHAT_MINIPROGRAM = 'wechatMiniProgram';

Accounts.registerLoginHandler(WECHAT_MINIPROGRAM, function(options) {
	if (!options.wechatMiniProgram) {
		return;
	}

	check(options[WECHAT_MINIPROGRAM], Match.ObjectIncluding({
		loginCode: String,
		code: Match.Optional(String),
		iv: String,
		encryptedData: String,
	}));

	const { loginCode, code, iv, encryptedData } = options[WECHAT_MINIPROGRAM];
	const {
		errcode,
		errmsg,
		sessionKey,
		openid: openId,
		unionid: unionId,
	} = WechatAPI.snsJscode2session(loginCode);
	if (errcode && errcode !== 0) {
		console.log('微信小程序登录失败[sns/jscode2session] errcode:', errcode, ', errmsg:', errmsg);
		return {
			type: WECHAT_MINIPROGRAM,
			error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'User creation failed from WeChat response token'),
		};
	}

	const tokenExpires = new Date();
	tokenExpires.setMonth(tokenExpires.getMonth() + 1);

	const user = Meteor.users.findOne({ [`services.${ WECHAT_MINIPROGRAM }.id`]: openId });
	if (user) {
		const { token } = Accounts._generateStampedLoginToken();
		return {
			type: WECHAT_MINIPROGRAM,
			userId: user._id,
			token,
			tokenExpires,
		};
	}

	let phoneNumber = {};
	if (code) {
		// 用于支持升级的小程序安全接口
		const {
			errcode,
			errmsg,
			phone_info: phoneInfo,
		} = WechatAPI.wxaBusinessGetuserphonenumber(code);
		if (errcode && errcode !== 0) {
			console.log('微信小程序登录失败[wxa/business/getuserphonenumber] errcode:', errcode, ', errmsg:', errmsg);
			return {
				type: WECHAT_MINIPROGRAM,
				error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'User creation failed from WeChat response token'),
			};
		}
		phoneNumber = phoneInfo;
	} else {
		const parseData = decodeAES128CBC(sessionKey, iv, encryptedData);
		phoneNumber = JSON.parse(parseData);
	}

	const { countryCode, purePhoneNumber, watermark } = phoneNumber;
	const serviceData = {
		id: openId,
		openId,
		unionId,
		appId: watermark.appid,
	};
	const smsServiceData = {
		realPhoneNumber: `+${ countryCode }${ purePhoneNumber }`,
		purePhoneNumber,
		countryCode: `+${ countryCode }`,
		verificationCodes: [],
	};

	const smsUser = Meteor.users.findOne({
		'services.sms.realPhoneNumber': smsServiceData.realPhoneNumber,
	});
	if (smsUser) {
		const { _id: userId } = smsUser;
		const { token } = Accounts._generateStampedLoginToken();

		Users.update({ _id: userId }, {
			$set: {
				[`services.${ WECHAT_MINIPROGRAM }`]: serviceData,
			},
		});

		return {
			type: WECHAT_MINIPROGRAM,
			userId,
			token,
			tokenExpires,
		};
	}

	return wechatCreateUser(WECHAT_MINIPROGRAM, serviceData, { tokenExpires, smsServiceData });
});
