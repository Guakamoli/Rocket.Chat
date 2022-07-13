import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';
import s from 'underscore.string';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Users } from '../../../../app/models';
import * as Mailer from '../../../../app/mailer';
import { settings } from '../../../../app/settings';

let html = '';
Meteor.startup(() => {
	Mailer.getTemplateWrapped('Rigister_Login_Verification_Email', (value) => {
		html = value;
	});
});

const emailRegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+$/i;

const getCode = () => {
	if (process.env.NODE_ENV === 'development') {
		return '111111';
	}
	return Math.random().toString().slice(2, 8);
};


const updateUserEmailCode = (userId, code) => {
	const modifier = {
		$push: {
			'services.email.verificationCodes': {
				code,
				when: new Date(),
			},
		},
	};
	Meteor.users.update({ _id: userId }, modifier);
};


export const operateVertificationCode = ({ email, code }) => {
	if (!emailRegExp.test(email)) {
		throw new Meteor.Error('Invalid email');
	}
	let userId;
	const user = Users.findOneByEmailAddress(email);
	if (!user) {
		throw new Meteor.Error('User not exist');
	}
	if (user) {
		userId = user._id;
		if (user.active === false) {
			throw new Meteor.Error('Problematic user', 'Problematic user');
		}
		if (code) {
			if (!user.services?.email?.verificationCodes?.length) {
				throw new Meteor.Error('Invalid error');
			}
			const verificationCode = user.services.email.verificationCodes.pop();
			if (verificationCode.code !== code) {
				throw new Meteor.Error('Invalid verification code');
			}
			if (verificationCode.when.getTime() + 15 * 60 * 1000 < new Date()) {
				throw new Meteor.Error('Expired verification code');
			}
			const modifier = {
				$set: {
					'services.email.verificationCodes': [],
				},
			};
			if (!('active' in user)) {
				modifier.$set.active = true;
			}
			Meteor.users.update({ _id: userId }, modifier);
		}
	}
	return { userId };
};

const sendCode = ({ email, language }) => {
	const userData = {
		email: s.trim(email.toLowerCase()),
		password: '',
	};
	let userId;
	let lng = 'zh';
	if (language && !language.includes('zh-')) {
		lng = 'en';
	}
	const emailData = {
		to: email,
		from: settings.get('From_Email'),
		subject: TAPi18n.__('Email_Register_login_title', { lng }),
		html: Mailer.translate(html, lng),
		data: {
			Email_Register_login_code: null,
		},
	};
	const user = Users.findOneByEmailAddress(email);

	if (user) {
		userId = user._id;
		if (user.active === false) {
			throw new Meteor.Error('Problematic user', 'Problematic user');
		}
		const verificationCodes = user?.services?.email?.verificationCodes || [];
		const verificationCode = verificationCodes[verificationCodes.length - 1];
		if (verificationCode) {
			const lastSendTimeDelta = Date.now() - verificationCode.when.getTime();
			if (lastSendTimeDelta < 60 * 1000) {
				throw new Meteor.Error('error-email-send-failed', 'Error trying to send email in limited time', {
					milsecond: lastSendTimeDelta,
				});
			}
		}
		const newCode = getCode();
		emailData.data.Email_Register_login_code = newCode;
		updateUserEmailCode(userId, newCode);
	} else {
		const newCode = getCode();
		emailData.data.Email_Register_login_code = newCode;
		userId = Accounts.createUser(userData);
		Users.setLanguage(userId, language);
		updateUserEmailCode(userId, newCode);
	}
	if (process.env.NODE_ENV === 'production') {
		try {
			Mailer.send(emailData);
		} catch ({ message }) {
			throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${ message }`, {
				method: 'sendSMTPTestEmail',
				message,
			});
		}
	}

	return { userId };
};

Accounts.registerLoginHandler('kameoEmail', function(options) {
	if (!options.kameoEmail) {
		return;
	}

	check(options, {
		kameoEmail: true,
		email: String,
		code: String,
	});
	return operateVertificationCode(options);
});

Meteor.methods({
	kameoSendEmailCode: (options) => {
		check(options, {
			email: String,
			language: Match.Optional(String),
		});
		if (!emailRegExp.test(options.email)) {
			throw new Meteor.Error('Invalid email');
		}
		return sendCode(options);
	},
});
