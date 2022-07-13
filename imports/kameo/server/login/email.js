import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { check, Match } from 'meteor/check';
import s from 'underscore.string';

import { Users } from '../../../../app/models';
import * as Mailer from '../../../../app/mailer';
import { settings } from '../../../../app/settings';

let html = '';
Meteor.startup(() => {
	Mailer.getTemplateWrapped('Rigister_Login_Verification_Email', (value) => {
		html = value;
	});
});

const getCode = () => {
	if (process.env.NODE_ENV) {
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
	const userData = {
		email: s.trim(email.toLowerCase()),
		password: '',
	};
	if (code && code.length !== 6) {
		throw new Meteor.Error('Invalid verification code');
	}

	let userId;
	const emailData = {
		to: email,
		from: settings.get('From_Email'),
		subject: 'Revo验证码',
		html,
		data: {
			code: null,
		},
	};
	const user = Users.findOneByEmailAddress(email);

	if (user) {
		userId = user._id;
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
					active: true,
				},
			};
			Meteor.users.update({ _id: userId }, modifier);
		} else {
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
			emailData.data.code = getCode();
			emailData.subject = 'Revo登录验证码';
			updateUserEmailCode(userId, emailData.data.code);
		}
	} else {
		if (code) {
			throw new Meteor.Error('Invalid user');
		}
		emailData.data.code = getCode();
		emailData.subject = 'Revo注册验证码';

		userId = Accounts.createUser(userData);
		updateUserEmailCode(userId, emailData.data.code);
	}

	if (!code) {
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
		code: Match.Optional(String),
	});
	return operateVertificationCode(options);
});
