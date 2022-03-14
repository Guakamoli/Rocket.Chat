import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

import { settings } from '../../../../app/settings/server';
import { callbacks } from '../../../../app/callbacks/server';
import { IMessage } from '../../../../definition/IMessage';

const Dep = new Tracker.Dependency();
Meteor.startup(() => {
	settings.get(/Message_AllowBadWordsFilter|Message_BadWordsFilterList|Message_BadWordsWhitelist/, () => {
		Dep.changed();
	});
	Tracker.autorun(() => {
		Dep.depend();
		const allowBadWordsFilter = settings.get('Message_AllowBadWordsFilter');

		callbacks.remove('beforeSaveMessage', 'filterBadWords');

		if (!allowBadWordsFilter) {
			return;
		}

		const badWordsList = settings.get('Message_BadWordsFilterList') as string | undefined;
		const whiteList = settings.get('Message_BadWordsWhitelist') as string | undefined;

		const words = badWordsList?.split(',').map((word) => word.trim()).filter(Boolean) || [];

		if (whiteList?.length) {
			const whiteWords = whiteList?.split(',').map((word) => word.trim()).filter(Boolean) || [];
			const beforeWords = words.filter((word) => !whiteWords.includes(word));
			words.splice(0).push(...beforeWords);
		}

		callbacks.add('beforeSaveMessage', function(message: IMessage) {
			if (!message.msg) {
				return message;
			}

			if (words.some((word) => message.msg.includes(word))) {
				throw new Meteor.Error('filter-bad-words-failed', 'Filter Bad words Failed');
			}

			return message;
		}, callbacks.priority.HIGH, 'filterBadWords');
	});
});
