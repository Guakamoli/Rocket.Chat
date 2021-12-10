import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import _ from 'underscore';
import s from 'underscore.string';
import toastr from 'toastr';

import { settings } from '../../../settings';
import { callbacks } from '../../../callbacks';
import { t, handleError } from '../../../utils';

Template.loginForm.helpers({
	userName() {
		const user = Meteor.user();
		return user && user.username;
	},
	namePlaceholder() {
		if (settings.get('Accounts_RequireNameForSignUp')) {
			return t('Name');
		}
		return t('Name_optional');
	},
	showFormLogin() {
		return settings.get('Accounts_ShowFormLogin');
	},
	state(...state) {
		return state.indexOf(Template.instance().state.get()) > -1;
	},
	btnLoginSave() {
		if (Template.instance().loading.get()) {
			return `${ t('Please_wait') }...`;
		}
		switch (Template.instance().state.get()) {
			case 'register':
				return t('Register');
			case 'login':
				return t('Login');
			case 'email-verification':
				return t('Send_confirmation_email');
			case 'forgot-password':
				return t('Reset_password');
			case 'email-login':
				return t('Login');
		}
	},
	loginTerms() {
		return settings.get('Layout_Login_Terms');
	},
	registrationAllowed() {
		const validSecretUrl = Template.instance().validSecretURL;
		return settings.get('Accounts_RegistrationForm') === 'Public' || (validSecretUrl && validSecretUrl.get());
	},
	linkReplacementText() {
		return settings.get('Accounts_RegistrationForm_LinkReplacementText');
	},
	passwordResetAllowed() {
		return settings.get('Accounts_PasswordReset');
	},
	requirePasswordConfirmation() {
		return settings.get('Accounts_RequirePasswordConfirmation');
	},
	emailPlaceholder() {
		return settings.get('Accounts_EmailOrUsernamePlaceholder') || t('Email');
	},
	phoneNumberPlaceholder() {
		return t('Input_mobile');
	},
	codePlaceholder() {
		return t('Input_code');
	},
	userAgreement() {
		return Meteor.settings.public.BLACKBOARD_USER_AGREEMENT_URL;
	},
	privacy() {
		return Meteor.settings.public.BLACKBOARD_PRIVACY_URL;
	},
	secs() {
		return `${ t('After_second_send', Template.instance().secs.get()) }`;
	},
	getSecs() {
		return Template.instance().secs.get() <= 0;
	},
	passwordPlaceholder() {
		return settings.get('Accounts_PasswordPlaceholder') || t('Password');
	},
	confirmPasswordPlaceholder() {
		return settings.get('Accounts_ConfirmPasswordPlaceholder') || t('Confirm_password');
	},
	manuallyApproveNewUsers() {
		return settings.get('Accounts_ManuallyApproveNewUsers');
	},
	typedEmail() {
		return s.trim(Template.instance().typedEmail);
	},
});

Template.loginForm.events({
	'submit #login-card'(event, instance) {
		event.preventDefault();
		$(event.target).find('button.login').focus();
		instance.loading.set(true);
		const formData = instance.validate();
		const state = instance.state.get();
		if (formData) {
			if (state === 'email-verification') {
				Meteor.call('sendConfirmationEmail', s.trim(formData.email), () => {
					instance.loading.set(false);
					callbacks.run('userConfirmationEmailRequested');
					toastr.success(t('We_have_sent_registration_email'));
					return instance.state.set('email-login');
				});
				return;
			}
			if (state === 'forgot-password') {
				Meteor.call('sendForgotPasswordEmail', s.trim(formData.email), (err) => {
					if (err) {
						handleError(err);
						return instance.state.set('login');
					}
					instance.loading.set(false);
					callbacks.run('userForgotPasswordEmailRequested');
					toastr.success(t('If_this_email_is_registered'));
					return instance.state.set('login');
				});
				return;
			}
			if (state === 'register') {
				formData.name = '';
				formData.secretURL = FlowRouter.getParam('hash');
				return Meteor.call('registerUser', formData, function(error) {
					instance.loading.set(false);
					if (error != null) {
						if (error.reason === 'Email already exists.') {
							toastr.error(t('Email_already_exists'));
						} else {
							handleError(error);
						}
						return;
					}
					callbacks.run('userRegistered');
					toastr.success(t('We_have_sent_registration_email'));
					// eslint-disable-next-line no-return-assign
					instance.state.set('email-login');
					// return window.location.href = Meteor.settings.public.LOGIN_ACTIVE_SUCCESS_URL;
					// return Meteor.loginWithPassword(s.trim(formData.email), formData.pass, function(error) {
					// 	if (error && error.error === 'error-invalid-email') {
					// 		return instance.state.set('wait-email-activation');
					// 	}
					// 	if (error && error.error === 'error-user-is-not-activated') {
					// 		return instance.state.set('wait-activation');
					// 	}
					// 	Session.set('forceLogin', false);
					// });
				});
			}
			let loginMethod = 'loginWithPassword';
			if (settings.get('LDAP_Enable')) {
				loginMethod = 'loginWithLDAP';
			}
			if (settings.get('CROWD_Enable')) {
				loginMethod = 'loginWithCrowd';
			}

			if (state === 'login') {
				const phoneNumber = s.trim(formData.phoneNumber);
				const phone = {
					phoneNumber,
					countryCode: '86',
				};
				return Meteor.loginWithKameoSms(phone, s.trim(formData.code), function(error) {
					instance.loading.set(false);
					if (error != null) {
						if (error.error === 'Invalid phone number') {
							// eslint-disable-next-line no-mixed-spaces-and-tabs
							 toastr.error(t('Mobile_format_error'));
						} else if (error.error === 'Invalid verification code') {
							// eslint-disable-next-line no-mixed-spaces-and-tabs
							 toastr.error(t('Code_failed'));
						} else if (error.error === 'Expired verification code') {
							toastr.error(t('Code_expired'));
						} else {
							return toastr.error(t('Code_expired'));
						}
					}
					Session.set('forceLogin', false);
				});
			}

			return Meteor[loginMethod](s.trim(formData.email), formData.pass, function(error) {
				instance.loading.set(false);
				if (error != null) {
					if (error.error === 'error-user-is-not-activated') {
						return toastr.error(t('Wait_activation_warning'));
					}
					if (error.error === 'error-invalid-email') {
						instance.typedEmail = formData.email;
						return instance.state.set('email-verification');
					}
					if (error.error === 'error-user-is-not-activated') {
						toastr.error(t('Wait_activation_warning'));
					} else if (error.error === 'error-app-user-is-not-allowed-to-login') {
						toastr.error(t('App_user_not_allowed_to_login'));
					} else if (error.error === 'error-login-blocked-for-ip') {
						toastr.error(t('Error_login_blocked_for_ip'));
					} else if (error.error === 'error-login-blocked-for-user') {
						toastr.error(t('Error_login_blocked_for_user'));
					} else {
						return toastr.error(t('User_not_found_or_incorrect_password'));
					}
				}
				Session.set('forceLogin', false);
			});
		}
	},
	'click .register'() {
		Template.instance().state.set('register');
		return callbacks.run('loginPageStateChange', Template.instance().state.get());
	},
	'click .goEmailLogin'() {
		Template.instance().state.set('email-login');
		return callbacks.run('loginPageStateChange', Template.instance().state.get());
	},
	'click .back-to-login'() {
		Template.instance().state.set('login');
		return callbacks.run('loginPageStateChange', Template.instance().state.get());
	},
	'click .forgot-password'() {
		Template.instance().state.set('forgot-password');
		return callbacks.run('loginPageStateChange', Template.instance().state.get());
	},
	'click .email-login'() {
		Template.instance().state.set('email-login');
		return callbacks.run('loginPageStateChange', Template.instance().state.get());
	},
	'click .send-code'(event, instance) {
		event.preventDefault();
		const formData = instance.validatePhoneNumber();
		if (formData) {
			const phoneNumber = s.trim(formData.phoneNumber);
			const phone = {
				phoneNumber,
				countryCode: '86',
			};
			return Meteor.kameoSendCode(phone, (error) => {
				if (error) {
					if (error.error === 'Incorrect number format') {
						toastr.error(t('Mobile_format_error'));
					} else if (error.error === 'Minute limit') {
						toastr.error(t('Retry_send'));
					} else {
						toastr.error(t('Code_send_fail'));
					}
					return;
				}
				toastr.success(t('Code_send_success'));
				instance.secs.set(60);
				const timer = setInterval(() => {
					if (instance.secs.get() < 1) {
						clearInterval(timer);
						return;
					}

					instance.secs.set(instance.secs.get() - 1);
				}, 1000);
			});
		}
	},
	'keyup #email'(event) {
		if (Template.instance().state.get() === 'email-login') {
			if (event.currentTarget.value.length > 5 && $('#pass').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
		if (Template.instance().state.get() === 'register') {
			if (event.currentTarget.value.length > 5 && $('#pass').val().length > 5 && $('#confirm-pass').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
	},
	'keyup #pass'(event) {
		if (Template.instance().state.get() === 'email-login') {
			if (event.currentTarget.value.length > 5 && $('#email').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
		if (Template.instance().state.get() === 'register') {
			if (event.currentTarget.value.length > 5 && $('#email').val().length > 5 && $('#confirm-pass').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
	},
	'keyup #confirm-pass'(event) {
		if (Template.instance().state.get() === 'email-login') {
			if (event.currentTarget.value.length > 5 && $('#email').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
		if (Template.instance().state.get() === 'register') {
			if (event.currentTarget.value.length > 5 && $('#pass').val().length > 5 && $('#email').val().length > 5) {
				$('.login').addClass('active');
			} else {
				$('.login').removeClass('active');
			}
		}
	},
});

Template.loginForm.onCreated(function() {
	const instance = this;
	const PHONE_MATCHER = /^(\+?86)?1[3-9]\d{9}$/;
	const CODE_MATCHER = /^\d{6}$/;
	this.loading = new ReactiveVar(false);
	this.secs = new ReactiveVar(0);

	if (Session.get('loginDefaultState')) {
		this.state = new ReactiveVar(Session.get('loginDefaultState'));
	} else {
		this.state = new ReactiveVar('email-login');
	}

	Tracker.autorun(() => {
		const registrationForm = settings.get('Accounts_RegistrationForm');
		if (registrationForm === 'Disabled' && this.state.get() === 'register') {
			this.state.set('login');
		}
	});

	this.validSecretURL = new ReactiveVar(false);
	this.validatePhoneNumber = function() {
		const formData = $('#login-card').serializeArray();
		const formObj = {};
		const validationObj = {};
		formData.forEach((field) => {
			formObj[field.name] = field.value;
		});
		const state = instance.state.get();
		if (state === 'login') {
			if (!formObj.phoneNumber || !PHONE_MATCHER.test(formObj.phoneNumber)) {
				validationObj.phoneNumber = t('mobileLengtLimit');
			}
		}
		$('#login-card h2').removeClass('error');
		$('#login-card input.error, #login-card select.error').removeClass('error');
		$('#login-card .input-error').text('');
		if (!_.isEmpty(validationObj)) {
			$('#login-card h2').addClass('error');

			Object.keys(validationObj).forEach((key) => {
				const value = validationObj[key];
				$(`#login-card input[name=${ key }], #login-card select[name=${ key }]`).addClass('error');
				$(`#login-card input[name=${ key }]~.input-error, #login-card select[name=${ key }]~.input-error`).text(value);
			});
			instance.loading.set(false);
			return false;
		}
		return formObj;
	};
	this.validate = function() {
		const formData = $('#login-card').serializeArray();
		const formObj = {};
		const validationObj = {};
		formData.forEach((field) => {
			formObj[field.name] = field.value;
		});
		const state = instance.state.get();
		if (state !== 'login' && state !== 'email-login') {
			if (!(formObj.email && /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i.test(formObj.email))) {
				validationObj.email = t('Invalid_email');
			}
		}
		if (state === 'login') {
			if (!formObj.phoneNumber || !PHONE_MATCHER.test(formObj.phoneNumber)) {
				validationObj.phoneNumber = t('mobileLengtLimit');
			}
			if (!formObj.code || !CODE_MATCHER.test(formObj.code)) {
				validationObj.code = t('mobileCodeLimit');
			}
		}
		if (state === 'email-login') {
			if (!formObj.email) {
				validationObj.email = t('Invalid_email');
			}
		}
		if (state !== 'forgot-password' && state !== 'email-verification' && state !== 'login') {
			if (!formObj.pass) {
				validationObj.pass = t('Invalid_pass');
			}
		}
		if (state === 'register') {
			// if (settings.get('Accounts_RequireNameForSignUp') && !formObj.name) {
			// 	validationObj.name = t('Invalid_name');
			// }
			if (settings.get('Accounts_RequirePasswordConfirmation') && formObj['confirm-pass'] !== formObj.pass) {
				validationObj['confirm-pass'] = t('Invalid_confirm_pass');
			}
			if (settings.get('Accounts_ManuallyApproveNewUsers') && !formObj.reason) {
				validationObj.reason = t('Invalid_reason');
			}
		}
		$('#login-card h2').removeClass('error');
		$('#login-card input.error, #login-card select.error').removeClass('error');
		$('#login-card .input-error').text('');
		if (!_.isEmpty(validationObj)) {
			$('#login-card h2').addClass('error');

			Object.keys(validationObj).forEach((key) => {
				const value = validationObj[key];
				$(`#login-card input[name=${ key }], #login-card select[name=${ key }]`).addClass('error');
				$(`#login-card input[name=${ key }]~.input-error, #login-card select[name=${ key }]~.input-error`).text(value);
			});
			instance.loading.set(false);
			return false;
		}
		return formObj;
	};
	if (FlowRouter.getParam('hash')) {
		return Meteor.call('checkRegistrationSecretURL', FlowRouter.getParam('hash'), () => this.validSecretURL.set(true));
	}
});

Template.loginForm.onRendered(function() {
	Session.set('loginDefaultState');
	return Tracker.autorun(() => {
		callbacks.run('loginPageStateChange', this.state.get());
		switch (this.state.get()) {
			case 'login':
			case 'forgot-password':
			case 'email-login':
			case 'email-verification':
				return Meteor.defer(function() {
					return $('input[name=email]').select().focus();
				});
			case 'register':
				return Meteor.defer(function() {
					return $('input[name=name]').select().focus();
				});
		}
	});
});
