import { Meteor } from 'meteor/meteor';

import { API } from '../../../../../app/api/server';


API.v1.addRoute('contacts.add', { authRequired: true }, {
	post() {
		Meteor.runAsUser(this.userId, () => {
			Meteor.call('kameoAddContact', { uid: this.userId, fuid: this.bodyParams.fuid });
		});

		return API.v1.success();
	},
});
