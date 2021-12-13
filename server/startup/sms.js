import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Meteor.startup(function () {
	// Accounts.kameoSms.configure({
	// 	aliyun: {
	// 		accessKeyId: process.env.SMS_ACCESS_KEY_ID,
	// 		secretAccessKey: process.env.SMS_ACCESS_KEY_SECRET,
	// 		signName: process.env.SMS_SIGN_NAME,
	// 		templateCode: process.env.SMS_TEMPLATE_CODE,
	// 	},
	// 	env: process.env.NODE_ENV,
	// 	productCode: process.env.PRODUCT_CODE,
	// });
});
