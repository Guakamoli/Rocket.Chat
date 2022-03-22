import { Meteor } from 'meteor/meteor';

import { settings } from '../../../../app/settings/server';

const words = [];

Meteor.methods({
	kameoCheckedMessage(message) {
		if (words.length === 0) {
			const badWordsList = settings.get('Message_BadWordsFilterList');
			if (badWordsList) {
				words.push(...badWordsList.split(',').map((word) => word.trim()).filter(Boolean));
			}

			const whiteList = settings.get('Message_BadWordsWhitelist');
			if (whiteList) {
				const whiteWords = whiteList?.split(',').map((word) => word.trim()).filter(Boolean) || [];
				const beforeWords = words.filter((word) => !whiteWords.includes(word));
				words.splice(0).push(...beforeWords);
			}
		}

		const allowBadWordsFilter = settings.get('Message_AllowBadWordsFilter');
		if (!allowBadWordsFilter) {
			return;
		}

		if (words.some((word) => (message || '').includes(word))) {
			throw new Meteor.Error('filter-bad-words-failed', 'Filter Bad words Failed');
		}
	},
});
