import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

import { Users, Subscriptions } from '../../app/models/server';

Meteor.methods({
	saveUserPreferences(settings) {
		const keys = {
			language: Match.Optional(String),
			newRoomNotification: Match.Optional(String),
			newMessageNotification: Match.Optional(String),
			clockMode: Match.Optional(Number),
			useEmojis: Match.Optional(Boolean),
			convertAsciiEmoji: Match.Optional(Boolean),
			saveMobileBandwidth: Match.Optional(Boolean),
			collapseMediaByDefault: Match.Optional(Boolean),
			autoImageLoad: Match.Optional(Boolean),
			emailNotificationMode: Match.Optional(String),
			unreadAlert: Match.Optional(Boolean),
			notificationsSoundVolume: Match.Optional(Number),
			desktopNotifications: Match.Optional(String),
			audioNotifications: Match.Optional(String),
			mobileNotifications: Match.Optional(String),
			enableAutoAway: Match.Optional(Boolean),
			highlights: Match.Optional([String]),
			messageViewMode: Match.Optional(Number),
			hideUsernames: Match.Optional(Boolean),
			hideRoles: Match.Optional(Boolean),
			displayAvatars: Match.Optional(Boolean),
			hideFlexTab: Match.Optional(Boolean),
			sendOnEnter: Match.Optional(String),
			idleTimeLimit: Match.Optional(Number),
			sidebarShowFavorites: Match.Optional(Boolean),
			sidebarShowUnread: Match.Optional(Boolean),
			sidebarSortby: Match.Optional(String),
			sidebarViewMode: Match.Optional(String),
			sidebarDisplayAvatar: Match.Optional(Boolean),
			sidebarGroupByType: Match.Optional(Boolean),
			muteFocusedConversations: Match.Optional(Boolean),
			region: Match.Optional(String),
		};
		check(settings, Match.ObjectIncluding(keys));
		const user = Meteor.user();

		if (!user) {
			return false;
		}

		const {
			desktopNotifications: oldDesktopNotifications,
			mobileNotifications: oldMobileNotifications,
			emailNotificationMode: oldEmailNotifications,
			audioNotifications: oldAudioNotifications,
		} = (user.settings && user.settings.preferences) || {};

		if (user.settings == null) {
			Users.clearSettings(user._id);
		}

		if (settings.language != null) {
			Users.setLanguage(user._id, settings.language);
		}

		if (settings.region != null) {
			Users.setRegion(user._id, settings.region);
		}

		// Keep compatibility with old values
		if (settings.emailNotificationMode === 'all') {
			settings.emailNotificationMode = 'mentions';
		} else if (settings.emailNotificationMode === 'disabled') {
			settings.emailNotificationMode = 'nothing';
		}

		if (settings.idleTimeLimit != null && settings.idleTimeLimit < 60) {
			throw new Meteor.Error('invalid-idle-time-limit-value', 'Invalid idleTimeLimit');
		}

		Users.setPreferences(user._id, settings);
		Meteor.call('kameoRocketmqSendGorseUser', { userId: user._id });

		// propagate changed notification preferences
		Meteor.defer(() => {
			if (settings.desktopNotifications && oldDesktopNotifications !== settings.desktopNotifications) {
				if (settings.desktopNotifications === 'default') {
					Subscriptions.clearNotificationUserPreferences(user._id, 'desktopNotifications', 'desktopPrefOrigin');
				} else {
					Subscriptions.updateNotificationUserPreferences(user._id, settings.desktopNotifications, 'desktopNotifications', 'desktopPrefOrigin');
				}
			}

			if (settings.mobileNotifications && oldMobileNotifications !== settings.mobileNotifications) {
				if (settings.mobileNotifications === 'default') {
					Subscriptions.clearNotificationUserPreferences(user._id, 'mobilePushNotifications', 'mobilePrefOrigin');
				} else {
					Subscriptions.updateNotificationUserPreferences(user._id, settings.mobileNotifications, 'mobilePushNotifications', 'mobilePrefOrigin');
				}
			}

			if (settings.emailNotificationMode && oldEmailNotifications !== settings.emailNotificationMode) {
				if (settings.emailNotificationMode === 'default') {
					Subscriptions.clearNotificationUserPreferences(user._id, 'emailNotifications', 'emailPrefOrigin');
				} else {
					Subscriptions.updateNotificationUserPreferences(user._id, settings.emailNotificationMode, 'emailNotifications', 'emailPrefOrigin');
				}
			}

			if (settings.audioNotifications && oldAudioNotifications !== settings.audioNotifications) {
				if (settings.audioNotifications === 'default') {
					Subscriptions.clearNotificationUserPreferences(user._id, 'audioNotifications', 'audioPrefOrigin');
				} else {
					Subscriptions.updateNotificationUserPreferences(user._id, settings.audioNotifications, 'audioNotifications', 'audioPrefOrigin');
				}
			}

			if (Array.isArray(settings.highlights)) {
				Subscriptions.updateUserHighlights(user._id, settings.highlights);
			}
		});

		return true;
	},
});
