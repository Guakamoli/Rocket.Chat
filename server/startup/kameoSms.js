import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Meteor.startup(function() {
	Accounts.kameoSms.configure({
		aliyun: {
			accessKeyId: 'CHANGE_ME',
			secretAccessKey: 'CHANGE_ME',
			signName: 'CHANGE_ME',
			templateCode: 'CHANGE_ME',
		},
		env: 'production',
	});
});
