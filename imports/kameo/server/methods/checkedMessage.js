import { Meteor } from 'meteor/meteor';

import { settings } from '../../../../app/settings/server';
import { Green } from '../utils/AliyunGreen';

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
	kameoCheckedContent(content) {
		const accessKeyId = process.env.GREEN_ACCESS_KEY_ID || '';
		const accessKeySecret = process.env.GREEN_ACCESS_KEY_SECRET || '';
		const regionId = process.env.GREEN_REGION_ID || '';

		if (content.length === 0 || !(accessKeyId && accessKeySecret && regionId)) {
			return 'pass';
		}

		const greenClient = new Green({
			accessKeyId,
			accessKeySecret,
			regionId,
		});

		const res = Promise.await(greenClient.textScan([content]));

		const results = res?.data?.[0]?.results;
		if (!results || (Array.isArray(results) && results.length === 0)) {
			return 'block';
		}

		for (const result of results) {
			if (result.label !== 'normal') {
				if (result.suggestion === 'block') {
					return 'block';
				}
			}
		}

		return 'pass';
	},
});
