import stream from 'stream';

import { check } from 'meteor/check';
import { UploadFS } from 'meteor/jalik:ufs';
import { Random } from 'meteor/random';
import _ from 'underscore';
import path from "path";
import OpenApi from "@alicloud/openapi-client";
import $vod20170321 from "@alicloud/vod20170321";
import * as $tea from "@alicloud/tea-typescript";
import OSS from "ali-oss";
import { md5 } from "../../../utils/lib/random";

/**
 * AliyunOss store
 * @param options
 * @constructor
 */

export class AliyunOSSStore extends UploadFS.Store {
	constructor(options) {
		// Default options
		// options.secretAccessKey,
		// options.accessKeyId,
		// options.region,
		// options.sslEnabled // optional

		options = _.extend({
			httpOptions: {
				timeout: 6000,
				agent: false,
			},
		}, options);

		super(options);

		const classOptions = options;

		const oss = new OSS(options.commonConfig);
		const vod = new $vod20170321(options.videoConfig);
		options.getPath = options.getPath || function (file) {
			return file._id;
		};

		this.getPath = function (file) {
			if (file.AliyunOSS) {
				return file.AliyunOSS.path;
			}
		};

		this.getRedirectURL = function (file, forceDownload = false, callback) {
			const params = {
				Key: this.getPath(file),
				Expires: classOptions.URLExpiryTimeSpan,
				ResponseContentDisposition: `${forceDownload ? 'attachment' : 'inline'}; filename="${encodeURI(file.name)}"`,
			};

			return oss.getSignedUrl('getObject', params, callback);
		};

		/**
		 * Creates the file in the collection
		 * @param file
		 * @param callback
		 * @return {string}
		 */
		this.create = function (file, callback) {
			check(file, Object);

			if (file._id == null) {
				file._id = Random.id();
			}

			file.AliyunOSS = {
				path: this.options.getPath(file),
			};

			file.store = this.options.name; // assign store to file
			return this.getCollection().insert(file, callback);
		};

		/**
		 * Removes the file
		 * @param fileId
		 * @param callback
		 */
		this.delete = function (fileId, callback) {
			const file = this.getCollection().findOne({ _id: fileId });
			const params = {
				name: this.getPath(file),
				timeout: 30
			};

			oss.delete(params, (err, data) => {
				if (err) {
					console.error(err);
				}

				callback && callback(err, data);
			});
		};

		/**
		 * Returns the file read stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getReadStream = function (fileId, file, options = {}) {
			const params = {
				name: this.getPath(file),
			};

			if (options.start && options.end) {
				params.Range = `${options.start} - ${options.end}`;
			}

			return oss.getStream(params)
		};

		/**
		 * Returns the file write stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getWriteStream = function (fileId, file/* , options*/) {
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

			oss.putStream({
				name: this.getPath(file),
				stream: writeStream,
				mime: file.type,

			}, (error) => {
				if (error) {
					console.error(error);
				}

				writeStream.emit('real_finish');
			});

			return writeStream;
		};
	}
}

// Add store to UFS namespace
UploadFS.store.AliyunOSS = AliyunOSSStore;
