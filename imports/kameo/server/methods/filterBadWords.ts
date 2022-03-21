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

		callbacks.remove('beforeSaveMessage', 'filterBadWords');

		callbacks.add('beforeSaveMessage', function(message: IMessage) {
			if (!message.msg) {
				return message;
			}

			Meteor.call('kameoCheckedMessage', message.msg);
			return message;
		}, callbacks.priority.HIGH, 'filterBadWords');
	});
});
