/* eslint-disable new-cap */
import stream from 'stream';

import { check } from 'meteor/check';
import { UploadFS } from 'meteor/jalik:ufs';
import { Random } from 'meteor/random';
import _ from 'underscore';

import { md5 } from '../../../utils/lib/random';
import { preSignature } from '../../../utils/lib/ossUtils.js';
import { OSSClient, ossComposeURL } from '../../../utils/lib/oss';

/**
 * AliyunOss store
 * @param options
 * @constructor
 */

export class AliyunOSSStore extends UploadFS.Store {
	constructor(options) {
		options = _.extend(
			{
				httpOptions: {
					timeout: 6000,
					agent: false,
				},
			},
			options,
		);

		super(options);
		// const vod = new VodClient(options.videoConfig);
		options.getPath = options.getPath
			|| function(file) {
				return file._id;
			};

		this.getPath = function(file) {
			return file.path;
		};

		this.getRedirectURL = function() {
			return '';
		};

		/**
		 * Creates the file in the collection
		 * @param file
		 * @param callback
		 * @return {string}
		 */
		this.create = function(file, callback) {
			check(file, Object);

			if (file._id == null) {
				file._id = Random.id();
			}

			file.AliyunOSS = {
				path: this.options.getPath(file),
			};
			if (file.type.startsWith('image')) {
				const imageId = md5(file.name);
				file.name = `default/${ imageId }/${ file.name }`;
			}
			file.store = this.options.name; // assign store to file
			return this.getCollection().insert(file, callback);
		};

		/**
		 * Removes the file
		 * @param fileId
		 * @param callback
		 */
		this.delete = function() {
			// 空实现
		};

		/**
		 * Returns the file read stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getReadStream = function(fileId) {
			console.info(options, '=================options options============');
			let url = this.getFileURL(fileId);
			if (!url) {
				const file = this.getCollection().findOne({ _id: fileId });
				url = file.url;
			}
			return Promise.await(fetch(url)).body;
		};
		this.getFileURL = function() {
			// 直接返回链接
			return this.url;
		};
		/**
		 * Returns the file write stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getWriteStream = function(fileId, file/* , options*/) {
			// 假设 file 中存在 region
			console.info(file.region, options, '===========file.region options============');
			const region = file.region || '';
			const writeStream = new stream.PassThrough();
			writeStream.length = file.size;
			writeStream.on('newListener', (event, listener) => {
				if (event === 'finish') {
					process.nextTick(() => {
						writeStream.removeListener(event, listener);
						writeStream.on('real_finish', listener);
					});
				}
			});
			this.oss = null;
			// let ossConfig = this.options.commonConfig;
			let ossConfig = region === 'cn' ? this.options.commonConfig : this.options.sgCommonConfig;
			let filename = file.name;
			if (file.type.startsWith('video')) {
				// 视频需要先获取到视频的上传凭证, 然后中传给oss继续处理
				const options = {
					title: filename,
					description: `达人ID: ${ file.userId }`,
					tags: file.userId,
					type: 'video',
					filename,
					contentType: file.type,
					contentDisposition: true,
				};
				ossConfig = Promise.await(preSignature({ ...options, region }));
				filename = ossConfig.filename;
				this.url = ossConfig.videoURL;
			} else {
				this.url = ossComposeURL(filename);
			}
			this.oss = OSSClient.init(ossConfig);

			this.oss.$store.putStream(
				filename,
				writeStream,
			).then((result) => {
				if (result.res.status === 200) {
					writeStream.emit('real_finish');
				}
			});
			return writeStream;
		};
	}
}

// Add store to UFS namespace
UploadFS.store.AliyunOSS = AliyunOSSStore;
