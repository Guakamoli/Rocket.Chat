import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { settings } from '../../../settings';

Template.loginHeader.helpers({
	productCodeWidth() {
		return Meteor.settings.public.PRODUCT_CODE === 'GODUCK' ? '' : '';
	},
	grecaptchaUrl() {
		const domain = settings.get('Accounts_Recaptcha_Domain');
		const version = settings.get('Accounts_Recaptcha_Version');

		const pubkey = settings.get('Accounts_Recaptcha_Pubkey');
		if (version === 'v3') {
			return `${ domain }/recaptcha/enterprise.js?render=${ pubkey }`;
		}

		return `${ domain }/recaptcha/enterprise.js`;
	},
	logoUrl() {
		const asset = settings.get('Assets_logo');
		const productCode = Meteor.settings.public.PRODUCT_CODE;
		const imageUrl = productCode === 'GODUCK' ? 'images/logo/torimi.png' : 'images/logo/paiya.png';
		const prefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
		if (asset != null) {
			return `${ prefix }/${ asset.url || imageUrl }`;
		}
	},
});
