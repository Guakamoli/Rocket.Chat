import { settings } from '../../../settings';

settings.addGroup('FileUpload', function() {
	this.add('FileUpload_Enabled', true, {
		type: 'boolean',
		public: true,
	});

	this.add('FileUpload_MaxFileSize', 104857600, {
		type: 'int',
		public: true,
		i18nDescription: 'FileUpload_MaxFileSizeDescription',
	});

	this.add('FileUpload_MediaTypeWhiteList', '', {
		type: 'string',
		public: true,
		i18nDescription: 'FileUpload_MediaTypeWhiteListDescription',
	});

	this.add('FileUpload_MediaTypeBlackList', 'image/svg+xml', {
		type: 'string',
		public: true,
		i18nDescription: 'FileUpload_MediaTypeBlackListDescription',
	});

	this.add('FileUpload_ProtectFiles', true, {
		type: 'boolean',
		public: true,
		i18nDescription: 'FileUpload_ProtectFilesDescription',
	});

	this.add('FileUpload_RotateImages', true, {
		type: 'boolean',
	});

	this.add('FileUpload_Enable_json_web_token_for_files', true, {
		type: 'boolean',
		i18nLabel: 'FileUpload_Enable_json_web_token_for_files',
		i18nDescription: 'FileUpload_Enable_json_web_token_for_files_description',
		enableQuery: {
			_id: 'FileUpload_ProtectFiles',
			value: true,
		},
	});

	this.add('FileUpload_json_web_token_secret_for_files', '', {
		type: 'string',
		i18nLabel: 'FileUpload_json_web_token_secret_for_files',
		i18nDescription: 'FileUpload_json_web_token_secret_for_files_description',
		enableQuery: {
			_id: 'FileUpload_Enable_json_web_token_for_files',
			value: true,
		},
	});

	this.add('FileUpload_Storage_Type', 'GridFS', {
		type: 'select',
		values: [{
			key: 'GridFS',
			i18nLabel: 'GridFS',
		}, {
			key: 'AmazonS3',
			i18nLabel: 'AmazonS3',
		}, {
			key: 'GoogleCloudStorage',
			i18nLabel: 'GoogleCloudStorage',
		}, {
			key: 'Webdav',
			i18nLabel: 'WebDAV',
		}, {
			key: 'FileSystem',
			i18nLabel: 'FileSystem',
		}, {
			key: 'AliyunOSS',
			i18nLabel: 'AliyunOSS',
		}],
		public: true,
	});
	this.section('AliyunOSS', function() {
		this.add('FileUpload_AliOSS_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Endpoint', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_AccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_AccessKeySecret', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Domain', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_AccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_Video_AccessKeySecret', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_Video_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_Endpoint', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});

		this.add('FileUpload_AliOSS_Video_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_Domain', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_WorkFlowId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_CateIdVideo', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_Video_CateIdCover', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});


		// 新增新加坡存储
		this.add('FileUpload_AliOSS_SG_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Endpoint', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_AccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_SG_AccessKeySecret', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_SG_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Domain', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_AccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_SG_Video_AccessKeySecret', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
			secret: true,
		});
		this.add('FileUpload_AliOSS_SG_Video_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_Endpoint', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});

		this.add('FileUpload_AliOSS_SG_Video_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_Domain', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_WorkFlowId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_CateIdVideo', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
		this.add('FileUpload_AliOSS_SG_Video_CateIdCover', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AliyunOSS',
			},
		});
	});
	this.section('Amazon S3', function() {
		this.add('FileUpload_S3_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Acl', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_AWSAccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			secret: true,
		});
		this.add('FileUpload_S3_AWSSecretAccessKey', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			secret: true,
		});
		this.add('FileUpload_S3_CDN', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_BucketURL', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			i18nDescription: 'Override_URL_to_which_files_are_uploaded_This_url_also_used_for_downloads_unless_a_CDN_is_given.',
			secret: true,
		});
		this.add('FileUpload_S3_SignatureVersion', 'v4', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_ForcePathStyle', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_URLExpiryTimeSpan', 120, {
			type: 'int',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			i18nDescription: 'FileUpload_S3_URLExpiryTimeSpan_Description',
		});
		this.add('FileUpload_S3_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
	});

	this.section('Google Cloud Storage', function() {
		this.add('FileUpload_GoogleStorage_Bucket', '', {
			type: 'string',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_AccessId', '', {
			type: 'string',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_Secret', '', {
			type: 'string',
			multiline: true,
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
		});
		this.add('FileUpload_GoogleStorage_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
		});
	});

	this.section('File System', function() {
		this.add('FileUpload_FileSystemPath', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'FileSystem',
			},
		});
	});

	this.section('WebDAV', function() {
		this.add('FileUpload_Webdav_Upload_Folder_Path', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Server_URL', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Username', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
			secret: true,
		});
		this.add('FileUpload_Webdav_Password', '', {
			type: 'password',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
			secret: true,
		});
		this.add('FileUpload_Webdav_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
	});

	this.add('FileUpload_Enabled_Direct', true, {
		type: 'boolean',
		public: true,
	});
});
