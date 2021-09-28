import { Meteor } from 'meteor/meteor';

Meteor.startup(function() {
	Meteor.settings.public.NODE_ENV = process.env.NODE_ENV;
	Meteor.settings.public.LOGIN_ACTIVE_SUCCESS_URL = process.env.LOGIN_ACTIVE_SUCCESS_URL;
	Meteor.settings.public.BLACKBOARD_USER_AGREEMENT_URL = process.env.BLACKBOARD_USER_AGREEMENT_URL;
	Meteor.settings.public.BLACKBOARD_PRIVACY_URL = process.env.BLACKBOARD_PRIVACY_URL;
	Meteor.settings.public.INTERNAL_X_SECRET = process.env.INTERNAL_X_SECRET;
});
