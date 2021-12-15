import { TextInput } from '@rocket.chat/fuselage';
import { useSafely } from '@rocket.chat/fuselage-hooks';
import React, { useState, useCallback } from 'react';
import toastr from 'toastr';

import { useRouteParameter, useRoute } from '../../../contexts/RouterContext';
import { useMethod } from '../../../contexts/ServerContext';
import { useTranslation } from '../../../contexts/TranslationContext';
// import { useUser } from '../../../contexts/UserContext';
// import { useMethodData } from '../../../hooks/useMethodData';

// const getChangePasswordReason = ({
// 	requirePasswordChange,
// 	requirePasswordChangeReason = requirePasswordChange
// 		? 'You_need_to_change_your_password'
// 		: 'Please_enter_your_new_password_below',
// } = {}) => requirePasswordChangeReason;

const ResetPassword = () => {
	// const user = useUser();
	const t = useTranslation();
	const setUserPassword = useMethod('setUserPassword');
	const resetPassword = useMethod('resetPassword');
	const token = useRouteParameter('token');
	// const params = useMemo(
	// 	() => [
	// 		{
	// 			token,
	// 		},
	// 	],
	// 	[token],
	// );

	// const { value: { enabled: policyEnabled, policy: policies } = {} } = useMethodData(
	// 	'getPasswordPolicy',
	// 	params,
	// );

	const router = useRoute('home');

	// const changePasswordReason = getChangePasswordReason(user || {});

	const [newPassword, setNewPassword] = useState('');
	const [comfirmPassword, setComfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useSafely(useState(false));
	// const [error, setError] = useSafely(useState());

	const handleOnChange = useCallback(
		(event) => setNewPassword(event.currentTarget.value),
		[setNewPassword],
	);

	const handleOnComfirmPasswordChange = useCallback(
		(event) => setComfirmPassword(event.currentTarget.value),
		[setComfirmPassword],
	);

	const isSubmitDisabled =
		newPassword.trim().length < 5 || newPassword.trim() !== comfirmPassword.trim() || isLoading;

	const goLogin = () => {
		router.push({});
	};

	const handleSubmit = useCallback(
		async (e) => {
			e.preventDefault();
			if (isSubmitDisabled) {
				return;
			}
			setIsLoading(true);
			try {
				if (token && resetPassword) {
					await resetPassword(token, newPassword);
					toastr.success(t('Reset_password_success'));
					// await Meteor.loginWithToken(result.token);
					router.push({});
				} else {
					await setUserPassword(newPassword);
				}
			} catch ({ error, reason = error }) {
				toastr.error(t(error));
				// setError(reason);
			} finally {
				setIsLoading(false);
			}
		},
		[
			isSubmitDisabled,
			setIsLoading,
			token,
			resetPassword,
			newPassword,
			router,
			setUserPassword,
			// setError,
			t,
		],
	);

	return (
		<div
			style={{
				position: 'relative',
				zIndex: 1,
				width: '100%',
				maxWidth: '520px',
				margin: '20px auto',
				padding: '20px',
			}}
		>
			<div>
				<div className='rc-input__wrapper'>
					<TextInput
						placeholder={t('Password')}
						type='password'
						name='newPassword'
						id='newPassword'
						dir='auto'
						onChange={handleOnChange}
						autoComplete='off'
						value={newPassword}
						style={{ width: '100%' }}
					/>
				</div>
				<div className='rc-input__wrapper'>
					<TextInput
						placeholder={t('Confirm_password')}
						type='password'
						name='comfirmPassword'
						id='comfirmPassword'
						dir='auto'
						onChange={handleOnComfirmPasswordChange}
						autoComplete='off'
						value={comfirmPassword}
						style={{ width: '100%', outline: 'none' }}
					/>
				</div>
				<button
					type='button'
					className={`rc-button rc-button--nude login${isSubmitDisabled ? '' : ' active'}`}
					style={{
						width: '100%',
						color: 'white',
						marginTop: '20px',
					}}
					onClick={handleSubmit}
				>
					{t('Reset_password_btn')}
				</button>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					marginTop: '100px',
				}}
			>
				<div style={{ color: '#9B9B9B' }}>{t('Login_has_not_account')}</div>
				<button
					type='button'
					className='rc-button rc-button--nude register'
					style={{ color: '#651FFF', padding: '0px' }}
					onClick={goLogin}
				>
					{t('Login_go_register')}
				</button>
			</div>
		</div>
	);
};

export default ResetPassword;
