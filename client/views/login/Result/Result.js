import React, { useEffect } from 'react';

import { useQueryStringParameter } from '../../../contexts/RouterContext';
import { useTranslation } from '../../../contexts/TranslationContext';

const Result = () => {
	// 1、验证邮箱 2、重制密码
	const t = useTranslation();
	const type = useQueryStringParameter('type');
	const imageUrl = '/images/logo/success.png';
	useEffect(() => {
		$('.logo').eq(0).hide();
		return () => {
			$('.logo').eq(0).show();
		};
	});
	return (
		<div>
			<img src={imageUrl} style={{ width: '78px', height: '78px' }} />
			<div
				style={{
					marginTop: '20px',
					marginBottom: '5px',
					fontSize: '20px',
					color: '#333333',
					fontWeight: 500,
				}}
			>
				{type === '1' ? t('Verify_success') : t('Reset_success')}
			</div>
			<div style={{ fontSize: '15px', color: '#7987A1' }}>{t('Back_to_login')}</div>
		</div>
	);
};

export default Result;
