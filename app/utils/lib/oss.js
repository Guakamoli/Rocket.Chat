import path from 'path';

import OpenApi from '@alicloud/openapi-client';
import $vod20170321 from '@alicloud/vod20170321';
import * as $tea from '@alicloud/tea-typescript';
import OSS from 'ali-oss';
import _ from 'underscore';

import { md5 } from './random.js';
import { settings } from '../../settings';

const config = {};
const { default: Vod20170321 } = $vod20170321;

export class OSSClient {
	static ACCELERATE_ENDPOINT = config.OSS_ENDPOINT;

	/**
	 * @param {String} accessKeyId -
	 * @param {String} accessKeySecret -
	 * @param {Object} options -
	 * @param {String} options.stsToken -
	 * @param {String} options.endpoint -
	 * @param {String} options.bucket -
	 * @param {String} options.region -
	 */
	constructor(accessKeyId, accessKeySecret, options = {}) {
		const {
			stsToken,
			endpoint = OSSClient.ACCELERATE_ENDPOINT,
			bucket,
			region,
		} = options;
		const token = {
			accessKeyId,
			accessKeySecret,
		};

		if (stsToken) {
			token.stsToken = stsToken;
			token.refreshSTSToken = async () => token;
		}

		this.$store = new OSS({
			...token,
			secure: true,
			endpoint,
			bucket,
			region,
		});
	}

	/**
	 * 生成验签
	 * @param {String} filename -
	 * @param {Object} options -
	 * @param {String} options.type -
	 * @param {String} options.method -
	 * @param {Number} options.expires -
	 * @param {String} options.contentType -
	 * @param {Boolean} options.contentDisposition -
	 * @returns {Promise|String} -
	 */
	signature(filename, options = {}) {
		const {
			method = 'PUT',
			expires = 3600,
			contentType,
			contentDisposition = false,
		} = options;
		const response = {};
		if (contentDisposition) {
			response['content-disposition'] = `attachment; filename="${ filename }"`;
		}

		return this.$store.signatureUrl(filename, {
			expires: Number(expires),
			method,
			'Content-Type': contentType,
			response,
		});
	}

	/**
	 * @param {Object} options -
	 * @param {String} options.accessKeyId -
	 * @param {String} options.accessKeySecret -
	 * @param {String} options.securityToken -
	 * @param {String} options.filename -
	 * @param {String} options.bucket -
	 * @param {String} options.region -
	 * @returns {OSSClient} -
	 */
	static init(options = {}) {
		const {
			accessKeyId,
			accessKeySecret,
			securityToken: stsToken,
			filename,
			bucket,
			region,
		} = options;

		const opts = {
			stsToken,
			bucket,
			region,
			filename,
		};

		return new OSSClient(accessKeyId, accessKeySecret, opts);
	}
}

export class VodClient {
	static ENDPOINT = config.VOD_ENDPOINT;

	static USER_DATA = {
		AccelerateConfig: {
			Type: 'oss',
			Domain: OSSClient.ACCELERATE_ENDPOINT,
		},
	};

	/**
	 * @param {String} accessKeyId -
	 * @param {String} accessKeySecret -
	 * @param {Object} options -
	 * @param {String} options.endpoint -
	 */
	constructor(accessKeyId, accessKeySecret, options = {}) {
		const { endpoint = VodClient.ENDPOINT } = options;
		this.$vod = new Vod20170321(
			new OpenApi.Config({
				accessKeyId,
				accessKeySecret,
				endpoint,
			}),
		);
	}

	/**
	 * 创建上传视频凭证(不会上传视频)
	 * @param {String} fileName -
	 * @param {String} title -
	 * @param {Object} options -
	 * @param {String} options.coverURL -
	 * @param {String} options.workflowId -
	 * @param {String} options.userData -
	 * @param {String} options.description -
	 * @param {String} options.tags -
	 * @returns {Object|null|undefined} -
	 */
	async createVideo(fileName, title, options) {
		const { coverURL, workflowId, userData, description, tags } = options;
		const opts = {
			fileName,
			title,
			userData: JSON.stringify(userData),
			workflowId,
			cateId: Number(config.VOD_CATE_ID_VIDEO),
			description,
			tags,
		};

		if (coverURL) {
			opts.coverURL = coverURL;
		}

		const createUploadVideoRequest = new $vod20170321.CreateUploadVideoRequest(
			opts,
		);
		let resp = await this.$vod.createUploadVideo(createUploadVideoRequest);

		resp = $tea.toMap(resp);
		resp.body.UploadAddress =			JSON.parse(
			Buffer.from(resp.body.UploadAddress, 'base64').toString('ascii'),
		) || {};
		resp.body.UploadAuth =			JSON.parse(
			Buffer.from(resp.body.UploadAuth, 'base64').toString('ascii'),
		) || {};
		resp.body.VideoURL = `https://${ config.VOD_DOMAIN }/${ resp.body.UploadAddress.FileName }`;
		resp.body.FileURL = `https://${ config.VOD_BUCKET }/${ config.VOD_REGION }.aliyuncs.com/${ resp.body.UploadAddress.FileName }`;

		return resp;
	}

	/**
	 * 创建上传图片凭证(不会上传视频)
	 * @param {String} fileName -
	 * @param {String} title -
	 * @param {Object} options -
	 * @param {String} options.userData -
	 * @param {String} options.imageType -
	 * @param {String} options.imageExt -
	 * @param {String} options.description -
	 * @param {String} options.tags -
	 * @returns {Object|null|undefined} -
	 */
	async createCover(fileName, title, options) {
		const { userData, imageType, imageExt, description, tags } = options;
		const opts = {
			fileName,
			title,
			userData: JSON.stringify(userData),
			cateId: Number(config.VOD_CATE_ID_COVER),
			imageType,
			imageExt,
			description,
			tags,
		};
		const createUploadImageRequest = new $vod20170321.CreateUploadImageRequest(
			opts,
		);
		let resp = await this.$vod.createUploadImage(createUploadImageRequest);

		resp = $tea.toMap(resp);
		resp.body.UploadAddress =			JSON.parse(
			Buffer.from(resp.body.UploadAddress, 'base64').toString('ascii'),
		) || {};
		resp.body.UploadAuth =			JSON.parse(
			Buffer.from(resp.body.UploadAuth, 'base64').toString('ascii'),
		) || {};

		return resp;
	}

	/**
	 * 生成验签
	 * @param {Object} options -
	 * @param {String} options.filename -
	 * @param {String} options.coverURL -
	 * @param {String} options.description -
	 * @param {String} options.tags -
	 * @param {String} options.title -
	 * @param {String} options.workflowId -
	 * @param {String} options.userData -
	 * @param {String} options.imageType default, cover
	 * @param {String} options.imageExt jpg, jpeg, png, gif
	 * @returns {Promise} -
	 */
	async signature(options = {}) {
		const {
			filename,
			coverURL = '',
			description = '',
			tags = '',
			title = '',
			workflowId = config.VOD_WORKFLOW_ID,
			userData = VodClient.USER_DATA,
			imageType = 'default',
			imageExt = 'jpg',
			type,
		} = options;

		let resp = null;
		switch (type) {
			case 'video':
				resp = await this.createVideo(filename, title, {
					coverURL,
					workflowId,
					userData,
					description,
					tags,
				});
				break;
			case 'cover':
				resp = await this.createCover(filename, title, {
					userData,
					imageType,
					imageExt,
					description,
					tags,
				});
				break;
			default:
				throw $tea.newError('不支持的签名类型');
		}

		return resp;
	}

	async getPlayInfo(videoId) {
		const getPlayInfoRequest = new $vod20170321.GetPlayInfoRequest({ videoId });
		let resp = await this.$vod.getPlayInfo(getPlayInfoRequest);
		resp = $tea.toMap(resp);
		return resp;
	}
}

/**
 * @description 阿里云视频点播生成验签
 * @param {Object} options -
 * @param {String} options.filename -
 * @param {String} options.coverURL -
 * @param {String} options.description -
 * @param {String} options.tags -
 * @param {String} options.title -
 * @param {String} options.workflowId -
 * @param {String} options.userData -
 * @param {String} options.imageType -
 * @param {String} options.imageExt -
 * @param {String} options.type item: cover, video
 * @param {Boolean} options.contentDisposition -
 * @returns {Object} -
 */
export async function vodPreSignature(options = {}) {
	const accessKeyId = config.VOD_ACCESS_KEY_ID;
	const accessKeySecret = config.VOD_ACCESS_KEY_SECRET;

	const opts = {
		...options,
		title: options.title || options.filename,
		workflowId: options.workflowId || config.VOD_WORKFLOW_ID,
	};

	if (opts.type) {
		if (['cover', 'video'].includes(options.type)) {
			opts.type = options.type;
		} else {
			delete opts.type;
		}
	}
	const vod = new VodClient(accessKeyId, accessKeySecret);
	const {
		body: {
			UploadAddress = {},
			UploadAuth = {},
			RequestId: requestId = '',
			VideoId: videoId = '',
			VideoURL: videoURL = '',
			ImageId: imageId = '',
			ImageURL: imageURL = '',
		},
	} = await vod.signature(opts);
	const base = {
		requestId,
		accessKeyId: UploadAuth.AccessKeyId || '',
		accessKeySecret: UploadAuth.AccessKeySecret || '',
		securityToken: UploadAuth.SecurityToken || '',
		endpoint: OSSClient.ACCELERATE_ENDPOINT || config.VOD_BUCKET,
		bucket: UploadAddress.Bucket || config.VOD_BUCKET,
		region: UploadAuth.region || config.VOD_REGION,
		expiration: Number(UploadAuth.Expiration) || 0,
		filename: UploadAddress.FileName || '',
		domain: config.VOD_DOMAIN,
	};
	let attrInfo = {};
	if (opts.type === 'cover') {
		attrInfo = {
			imageId,
			imageURL,
		};
	}
	if (opts.type === 'video') {
		attrInfo = {
			videoId,
			videoURL,
		};
	}
	// 生成视频直播bucket的预签名地址
	const fileURL = OSSClient.init(base).signature(base.filename, {
		expires: base.expiration,
		contentType: opts.contentType,
		contentDisposition: opts.contentDisposition ?? false,
	});
	return {
		...base,
		...attrInfo,
		fileURL,
	};
}
/**
 * @description 拼接成完整的oss可访问URL
 * @param {String} filename 存放在oss上的相对文件路径
 * @param {Boolean} https 支持https协议
 * @returns {String} -
 */
export function ossComposeURL(filename, https = true) {
	return `${ https ? 'https' : 'http' }://${ config.OSS_DOMAIN }/${ path.join(
		'.',
		filename,
	) }`;
}
/**
 * @description 阿里云对象存储生成验签
 * @param {Object} options -
 * @param {String} options.filename -
 * @param {String} options.contentType -
 * @param {String} options.imageType -
 * @param {Boolean} options.contentDisposition -
 * @returns {Object} -
 */
export async function ossPreSignature(options = {}) {
	const { filename, imageType = 'default' } = options;
	const accessKeyId = config.OSS_ACCESS_KEY_ID;
	const accessKeySecret = config.OSS_ACCESS_KEY_SECRET;
	const oss = new OSSClient(accessKeyId, accessKeySecret, {
		bucket: config.OSS_BUCKET,
		region: config.OSS_REGION,
	});
	const imageId = md5(filename);
	const ossFilename = `${ imageType }/${ imageId }/${ filename }`;
	return {
		filename: ossFilename,
		endpoint: config.OSS_ENDPOINT,
		bucket: config.OSS_BUCKET,
		domain: config.OSS_DOMAIN,
		region: config.OSS_REGION,
		imageId,
		imageURL: ossComposeURL(ossFilename),
		fileURL: oss.signature(ossFilename, options),
	};
}
/**
 * @description 获取所有oss码率视频地址
 * @param {String} videoId 视频唯一ID
 * @returns {Object} -
 */
export async function ossGetPlayList(videoId) {
	const accessKeyId = config.VOD_ACCESS_KEY_ID;
	const accessKeySecret = config.VOD_ACCESS_KEY_SECRET;
	const vod = new VodClient(accessKeyId, accessKeySecret);
	const resp = await vod.getPlayInfo(videoId);
	const {
		PlayInfoList: { PlayInfo },
	} = resp.body;
	return PlayInfo.filter((video) => video.Status === 'Normal').reduce(
		(previous, video) => {
			if (video.Status === 'Normal') {
				previous[video.Definition] = video.PlayURL;
			}
			return previous;
		},
		{},
	);
}
const configure = _.debounce(function() {
	const specialKeys = ['AccessKeyId', 'AccessKeySecret'];
	const keys = [
		'Bucket',
		'AccessKeyId',
		'AccessKeySecret',
		'Region',
		'Endpoint',
		'Domain',
		'WorkFlowId',
		'CateIdVideo',
		'CateIdCover',
	];
	for (const key of keys) {
		let ossKey = key.replace(/^\S/, (s) => s.toLowerCase());
		ossKey = ossKey
			.replace(/([A-Z])/g, '_$1')
			.trim()
			.toUpperCase();
		const ossValue = settings.get(`FileUpload_AliOSS_${ key }`);
		const vodValue = settings.get(`FileUpload_AliOSS_Video_${ key }`);
		config[`OSS_${ ossKey }`] = ossValue;
		if (specialKeys.indexOf(key) > -1) {
			config[`VOD_${ ossKey }`] = ossValue;
		} else {
			config[`VOD_${ ossKey }`] = vodValue;
		}
	}

	OSSClient.ACCELERATE_ENDPOINT = config.OSS_ENDPOINT;
	VodClient.VOD_ENDPOINT = config.VOD_ENDPOINT;
}, 500);

settings.get(/^FileUpload_AliOSS_/, configure);
