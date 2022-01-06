/* eslint-disable new-cap */
import { check } from 'meteor/check';
import { UploadFS } from 'meteor/jalik:ufs';
import { Random } from 'meteor/random';
import _ from 'underscore';

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

		// const oss = new OSSClient.init(options.commonConfig);
		// const vod = new VodClient(options.videoConfig);
		options.getPath =			options.getPath
			|| function(file) {
				return file._id;
			};

		this.getPath = function(file) {
			if (file.AliyunOSS) {
				return file.AliyunOSS.path;
			}
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
		this.getReadStream = function() {
			return null;
		};

		/**
		 * Returns the file write stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getWriteStream = function() {
			return null;
		};
	}
}

// Add store to UFS namespace
UploadFS.store.AliyunOSS = AliyunOSSStore;
