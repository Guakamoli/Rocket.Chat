import { ossPreSignature, vodPreSignature } from './oss.js';

/**
 * @description 通用存储服务签名函数
 * @param {Object} options -
 * @param {String} options.title -
 * @param {String} options.filename -
 * @param {String} options.coverURL -
 * @param {String} options.title -
 * @param {String} options.workflowId -
 * @param {String} options.userData -
 * @param {String} options.imageType -
 * @param {String} options.imageExt -
 * @param {String} options.contentType -
 * @param {Boolean} options.contentDisposition -
 * @returns {Promise} -
 */
export async function preSignature(options = {}) {
	if (options.type === 'video') {
		return vodPreSignature({ ...options });
	}
	return ossPreSignature({ ...options });
}
