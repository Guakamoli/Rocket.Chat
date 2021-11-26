import NotificationClass from './NotificationClass';

const { PRODUCT_CODE } = process.env;
const currentProduct = (data) => data[PRODUCT_CODE];

export {
	PRODUCT_CODE,
	currentProduct,
	NotificationClass,
};
