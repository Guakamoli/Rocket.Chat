
import fs from 'fs';
import http from 'http';
import https from 'https';

import _ from 'underscore';
import { Meteor } from 'meteor/meteor';

import { settings } from '../../../settings';
import { FileUploadClass, FileUpload } from '../lib/FileUpload';
import '../../ufs/AliyunOSS/server.js';

const statSync = Meteor.wrapAsync(fs.stat);

const get = function(file, req, res) {
	const forceDownload = typeof req.query.download !== 'undefined';

	this.store.getRedirectURL(file, forceDownload, (err, fileUrl) => {
		if (err) {
			return console.error(err);
		}

		if (!fileUrl) {
			return res.end();
		}

		const storeType = file.store.split(':').pop();
		if (settings.get(`FileUpload_AliOSS_Proxy_${ storeType }`)) {
			const request = /^https:/.test(fileUrl) ? https : http;

			return FileUpload.proxyFile(
				file.name,
				fileUrl,
				forceDownload,
				request,
				req,
				res,
			);
		}

		return FileUpload.redirectToFile(fileUrl, req, res);
	});
};

const copy = function(file, out) {
	const fileUrl = this.store.getRedirectURL(file);

	if (fileUrl) {
		const request = /^https:/.test(fileUrl) ? https : http;
		request.get(fileUrl, (fileRes) => fileRes.pipe(out));
	} else {
		out.end();
	}
};

const AliyunOSSUploads = new FileUploadClass({
	name: 'AliyunOSS:Uploads',
	get,
	copy,
	// store setted bellow
});

const AliyunOSSAvatars = new FileUploadClass({
	name: 'AliyunOSS:Avatars',
	copy,
	get(file, req, res) {
		try {
			if (file.url && file.store === 'AliyunOSS:Avatars') {
				res.status(302);
				res.setHeader('Location', url);
				res.end();
				return;
			}
			const filePath = this.store.getFilePath(file._id, file);
			const stat = statSync(filePath);

			if (stat && stat.isFile()) {
				file = FileUpload.addExtensionTo(file);

				this.store.getReadStream(file._id, file).pipe(res);
			}
		} catch (e) {
			res.writeHead(404);
			res.end();
		}
	},
	// store setted bellow
});

const AliyunOSSUserDataFiles = new FileUploadClass({
	name: 'AliyunOSS:UserDataFiles',
	get,
	copy,
	// store setted bellow
});

const configure = _.debounce(function() {
	const keys = [
		'Bucket',
		'AccessKeyId',
		'AccessKeySecret',
		'Region',
		'Endpoint',
		'Domain',
	];
	const videoKeys = ['WorkFlowId', 'CateIdVideo', 'CateIdCover'];
	const config = {
		commonConfig: {},
		videoConfig: {},
	};
	for (const key of keys) {
		const lowKey = key.replace(/^\S/, (s) => s.toLowerCase());
		config.commonConfig[lowKey] = settings.get(`FileUpload_AliOSS_${ key }`);
		config.videoConfig[lowKey] = settings.get(
			`FileUpload_AliOSS_Video_${ key }`,
		);
	}
	for (const key of videoKeys) {
		const lowKey = key.replace(/^\S/, (s) => s.toLowerCase());
		config.videoConfig[lowKey] = settings.get(`FileUpload_AliOSS_Video_${ key }`);
	}
	AliyunOSSUploads.store = FileUpload.configureUploadsStore(
		'AliyunOSS',
		AliyunOSSUploads.name,
		config,
	);
	AliyunOSSAvatars.store = FileUpload.configureUploadsStore(
		'AliyunOSS',
		AliyunOSSAvatars.name,
		config,
	);
	AliyunOSSUserDataFiles.store = FileUpload.configureUploadsStore(
		'AliyunOSS',
		AliyunOSSUserDataFiles.name,
		config,
	);
}, 500);

settings.get(/^FileUpload_AliOSS_/, configure);
