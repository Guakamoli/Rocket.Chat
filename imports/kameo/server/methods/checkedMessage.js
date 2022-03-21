import { Meteor } from 'meteor/meteor';

import { settings } from '../../../../app/settings/server';

Meteor.methods({
	kameoCheckedMessage(message) {
		const allowBadWordsFilter = settings.get('Message_AllowBadWordsFilter');
		if (!allowBadWordsFilter) {
			return;
		}

		const badWordsList = settings.get('Message_BadWordsFilterList');
		const whiteList = settings.get('Message_BadWordsWhitelist');

		const words = badWordsList?.split(',').map((word) => word.trim()).filter(Boolean) || [];

		if (whiteList?.length) {
			const whiteWords = whiteList?.split(',').map((word) => word.trim()).filter(Boolean) || [];
			const beforeWords = words.filter((word) => !whiteWords.includes(word));
			words.splice(0).push(...beforeWords);
		}

		if (words.some((word) => message.msg.includes(word))) {
			throw new Meteor.Error('filter-bad-words-failed', 'Filter Bad words Failed');
		}
	},
});
