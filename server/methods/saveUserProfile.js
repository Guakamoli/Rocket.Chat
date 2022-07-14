/* eslint-disable complexity */
import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';

import { saveCustomFields, passwordPolicy } from '../../app/lib/server';
import { Users } from '../../app/models/server';
import { settings as rcSettings } from '../../app/settings/server';
import { twoFactorRequired } from '../../app/2fa/server/twoFactorRequired';
import { saveUserIdentity } from '../../app/lib/server/functions/saveUserIdentity';
import { compareUserPassword } from '../lib/compareUserPassword';
import { compareUserPasswordHistory } from '../lib/compareUserPasswordHistory';
import { checkInviteCodeAvailability } from '../../imports/kameo/server/utils';

function saveUserProfile(settings, customFields) {
	if (!rcSettings.get('Accounts_AllowUserProfileChange')) {
		throw new Meteor.Error('error-not-allowed', 'Not allowed', {
			method: 'saveUserProfile',
		});
	}

	if (!this.userId) {
		throw new Meteor.Error('error-invalid-user', 'Invalid user', {
			method: 'saveUserProfile',
		});
	}

	const user = Users.findOneById(this.userId);

	const mqProfile = { _id: this.userId };

	if (settings.realname) {
		mqProfile.name = settings.realname;
	}

	if (settings.username) {
		if (user.withSetUsername && settings.inviteCode && !checkInviteCodeAvailability(settings.inviteCode)) {
			throw new Meteor.Error('error-invalid-invite-code', 'Invalid invite code', { method: 'saveUserProfile' });
		}

		if (!saveUserIdentity({
			_id: this.userId,
			username: settings.username,
		})) {
			throw new Meteor.Error('error-could-not-save-identity', 'Could not save user identity', { method: 'saveUserProfile' });
		}

		mqProfile.username = settings.username;

		if (user.withSetUsername) {
			if (settings.inviteCode) {
				Meteor.call('kameoRocketmqSendInvite', { userId: this.userId, inviteCode: settings.inviteCode }, 'register');
			}
			Users.removeWithSetUsername(this.userId);
		}
	}

	if (settings.statusText || settings.statusText === '') {
		Meteor.call('setUserStatus', null, settings.statusText);
	}

	if (settings.statusType) {
		Meteor.call('setUserStatus', settings.statusType, null);
	}

	if (settings.bio != null) {
		if (typeof settings.bio !== 'string' || settings.bio.length > 260) {
			throw new Meteor.Error('error-invalid-field', 'bio', {
				method: 'saveUserProfile',
			});
		}
		Users.setBio(user._id, settings.bio.trim());

		mqProfile.bio = settings.bio.trim();
	}

	if (settings.note != null) {
		if (typeof settings.note !== 'string' || settings.note.length > 12) {
			throw new Meteor.Error('error-invalid-field', 'note', {
				method: 'saveUserProfile',
			});
		}
		Users.setNote(user._id, settings.note.trim());
	}

	if (settings.gender != null && settings.gender !== undefined) {
		if (typeof settings.gender !== 'number') {
			throw new Meteor.Error('error-invalid-field', 'gender', {
				method: 'saveUserProfile',
			});
		}
		Users.setGender(user._id, settings.gender);
	}

	if (settings.labels != null && settings.labels !== undefined) {
		if (!Array.isArray(settings.labels)) {
			throw new Meteor.Error('error-invalid-field', 'labels', {
				method: 'saveUserProfile',
			});
		}
		Users.setLabels(user._id, settings.labels);
	}

	if (settings.nickname != null) {
		if (typeof settings.nickname !== 'string' || settings.nickname.length > 120) {
			throw new Meteor.Error('error-invalid-field', 'nickname', {
				method: 'saveUserProfile',
			});
		}
		Users.setNickname(user._id, settings.nickname.trim());

		mqProfile.nickname = settings.nickname.trim();
	}

	if (settings.email) {
		Meteor.call('setEmail', settings.email);
	}

	const canChangePasswordForOAuth = rcSettings.get('Accounts_AllowPasswordChangeForOAuthUsers');
	if (canChangePasswordForOAuth || user.services?.password) {
		// Should be the last check to prevent error when trying to check password for users without password
		if (settings.newPassword && rcSettings.get('Accounts_AllowPasswordChange') === true) {
			// don't let user change to same password
			if (compareUserPassword(user, { plain: settings.newPassword })) {
				throw new Meteor.Error('error-password-same-as-current', 'Entered password same as current password', {
					method: 'saveUserProfile',
				});
			}

			if (user.services?.passwordHistory && !compareUserPasswordHistory(user, { plain: settings.newPassword })) {
				throw new Meteor.Error('error-password-in-history', 'Entered password has been previously used', {
					method: 'saveUserProfile',
				});
			}

			passwordPolicy.validate(settings.newPassword);

			Accounts.setPassword(this.userId, settings.newPassword, {
				logout: false,
			});

			Users.addPasswordToHistory(this.userId, user.services?.password.bcrypt);

			try {
				Meteor.call('removeOtherTokens');
			} catch (e) {
				Accounts._clearAllLoginTokens(this.userId);
			}
		}
	}

	Users.setProfile(this.userId, {});

	if (customFields && Object.keys(customFields).length) {
		saveCustomFields(this.userId, customFields);

		if (customFields.note) {
			mqProfile.note = customFields.note;
		}
	}

	Meteor.call('kameoRocketmqSendUpdateProfile', this.userId, mqProfile);

	return true;
}

const saveUserProfileWithTwoFactor = twoFactorRequired(saveUserProfile, {
	requireSecondFactor: true,
});

Meteor.methods({
	saveUserProfile(settings, customFields, ...args) {
		check(settings, Object);
		check(customFields, Match.Maybe(Object));

		if (settings.email || settings.newPassword) {
			return saveUserProfileWithTwoFactor.call(this, settings, customFields, ...args);
		}

		return saveUserProfile.call(this, settings, customFields);
	},
});
