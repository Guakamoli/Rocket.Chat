import { Meteor } from 'meteor/meteor';

import { FileUpload } from '../../../file-upload';
import { Rooms, Messages } from '../../../models';
import { API } from '../api';
import { findAdminRooms, findChannelAndPrivateAutocomplete, findAdminRoom, findRoomsAvailableForTeams } from '../lib/rooms';
import { sendFile, sendViaEmail } from '../../../../server/lib/channelExport';
import { canAccessRoom, hasPermission } from '../../../authorization/server';
import { Media } from '../../../../server/sdk';
import { settings } from '../../../settings/server/index';
import { getUploadFormData } from '../lib/getUploadFormData';
import { SystemLogger } from '../../../logger/server';
import { preSignature as aliyunPreSignature } from '../../../utils/lib/ossUtils';
import { isOverLimit } from '../../../../imports/kameo/server/functions/ratelimit';

function findRoomByIdOrName({ params, checkedArchived = true }) {
	if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
		throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
	}

	const fields = { ...API.v1.defaultFieldsToExclude };

	let room;
	if (params.roomId) {
		room = Rooms.findOneById(params.roomId, { fields });
	} else if (params.roomName) {
		room = Rooms.findOneByName(params.roomName, { fields });
	}
	if (!room) {
		throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
	}
	if (checkedArchived && room.archived) {
		throw new Meteor.Error('error-room-archived', `The channel, ${ room.name }, is archived`);
	}

	return room;
}

API.v1.addRoute('rooms.get', { authRequired: true }, {
	get() {
		const { updatedSince } = this.queryParams;

		let updatedSinceDate;
		if (updatedSince) {
			if (isNaN(Date.parse(updatedSince))) {
				throw new Meteor.Error('error-updatedSince-param-invalid', 'The "updatedSince" query parameter must be a valid date.');
			} else {
				updatedSinceDate = new Date(updatedSince);
			}
		}

		let result;
		Meteor.runAsUser(this.userId, () => { result = Meteor.call('rooms/get', updatedSinceDate); });

		if (Array.isArray(result)) {
			result = {
				update: result,
				remove: [],
			};
		}

		return API.v1.success({
			update: result.update.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
			remove: result.remove.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
		});
	},
});

API.v1.addRoute('rooms.upload/:rid', { authRequired: true }, {
	post() {
		// ratelimit request
		const overLimit = Promise.await(isOverLimit(this.userId, 'post'));
		if (overLimit) {
			console.log(`超过作品发布频率限制 rid=${ this.urlParams.rid } userId=${ this.userId }`);
			throw new Meteor.Error('invalid-request');
		}

		const room = Meteor.call('canAccessRoom', this.urlParams.rid, this.userId);

		if (!room) {
			return API.v1.unauthorized();
		}
		const { file, ...fields } = Promise.await(getUploadFormData({
			request: this.request,
		}));
		let fileList = fields['file[]'];
		if (fileList) {
			fileList = fileList.filter(Boolean);
			fileList = fileList.map((i) => JSON.parse(i));
		}
		Reflect.deleteProperty(fields, 'file[]');

		if (!fileList) {
			if (!file) {
				throw new Meteor.Error('invalid-field');
			}
			const details = {
				name: file.filename,
				size: file.fileBuffer.length,
				type: file.mimetype,
				rid: this.urlParams.rid,
				userId: this.userId,
			};

			const stripExif = settings.get('Message_Attachments_Strip_Exif');
			const fileStore = FileUpload.getStore('Uploads');
			if (stripExif) {
				// No need to check mime. Library will ignore any files without exif/xmp tags (like BMP, ico, PDF, etc)
				file.fileBuffer = Promise.await(Media.stripExifFromBuffer(file.fileBuffer));
			}
			const uploadedFile = fileStore.insertSync(details, file.fileBuffer);

			uploadedFile.description = fields.description;
			uploadedFile.uri = uploadedFile.url;
			fileList = [uploadedFile];
			delete fields.description;
			if (fields.width && fields.height) {
				uploadedFile.width = Number(fields.width);
				uploadedFile.height = Number(fields.height);
				delete fields.width;
				delete fields.height;
			}
		}

		fields.public = fields?.public === 'free';

		const messageType = this.request.headers['x-upload-type'] || null;
		if (messageType && ['post', 'story'].includes(messageType)) {
			fields.t = messageType;
			const { region } = fields;
			delete fields.region;
			fields.metadata = {
				audit: { state: 'audit' },
				region,
			};
			if (fileList.length === 0) {
				fields.metadata.audit.state = 'pass';
			}
		}
		SystemLogger.debug('rooms.upload/:rid', this.request.headers, messageType, fields);
		Meteor.call('sendFileMessage', this.urlParams.rid, null, fileList, fields);
		return API.v1.success({ message: Messages.findOneByRoomIdAndMessageId(this.urlParams.rid, fields._id) });
	},
});

API.v1.addRoute('rooms.getAliyunUploadPaths', { authRequired: true }, {
	// 1. 到阿里云去拿签名, 但是要注意签名是会过期的，太久没上传链接就传不了, 前端重传机制
	// 2. 这里要如果已经有file条目，不需要创建直接更新即可
	post() {
		const { fileList, region, workflowId } = this.bodyParams;
		if (!fileList?.length) {
			throw new Meteor.Error('error-fileList-param-invalid', 'The "fileList" query parameter must be a valid list.');
		}
		const result = [];
		for (const fileItem of fileList) {
			let options = {};
			const filename = fileItem.name;
			if (/^video\/.+/.test(fileItem.type)) {
				options = {
					title: filename,
					description: `达人ID: ${ this.userId }`,
					tags: this.userId,
					type: 'video',
					filename,
					contentType: fileItem.type,
					contentDisposition: true,
					userData: {
						Extend: {
							messageId: fileItem.extra.message_id,
							region: region || '',
						},
					},
				};

				if (workflowId) {
					options.workflowId = workflowId;
				}
			} else if (/^image\/.+/.test(fileItem.type)) {
				options = {
					filename,
					contentType: fileItem.type,
					containerName: fileItem.containerName || 'default',
					contentDisposition: true,
				};
			}
			const signatureItem = Promise.await(aliyunPreSignature({ ...options, region }));
			result.push({
				filename,
				uploadFileUrl: signatureItem.fileURL,
				uploadFileTs: Date.now(),
				assetsUrl: signatureItem.imageURL || signatureItem.videoURL,
			});
		}
		return API.v1.success({
			result,
		});
	},
});

API.v1.addRoute('rooms.saveNotification', { authRequired: true }, {
	post() {
		const saveNotifications = (notifications, roomId) => {
			Object.keys(notifications).forEach((notificationKey) =>
				Meteor.runAsUser(this.userId, () =>
					Meteor.call('saveNotificationSettings', roomId, notificationKey, notifications[notificationKey]),
				),
			);
		};
		const { roomId, notifications } = this.bodyParams;

		if (!roomId) {
			return API.v1.failure('The \'roomId\' param is required');
		}

		if (!notifications || Object.keys(notifications).length === 0) {
			return API.v1.failure('The \'notifications\' param is required');
		}

		saveNotifications(notifications, roomId);

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.favorite', { authRequired: true }, {
	post() {
		const { favorite } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('favorite')) {
			return API.v1.failure('The \'favorite\' param is required');
		}

		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => Meteor.call('toggleFavorite', room._id, favorite));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.cleanHistory', { authRequired: true }, {
	post() {
		const findResult = findRoomByIdOrName({ params: this.bodyParams });

		const {
			latest,
			oldest,
			inclusive = false,
			limit,
			excludePinned,
			filesOnly,
			ignoreThreads,
			ignoreDiscussion,
			users,
		} = this.bodyParams;

		if (!latest) {
			return API.v1.failure('Body parameter "latest" is required.');
		}

		if (!oldest) {
			return API.v1.failure('Body parameter "oldest" is required.');
		}

		const count = Meteor.runAsUser(this.userId, () => Meteor.call('cleanRoomHistory', {
			roomId: findResult._id,
			latest: new Date(latest),
			oldest: new Date(oldest),
			inclusive,
			limit,
			excludePinned: [true, 'true', 1, '1'].includes(excludePinned),
			filesOnly: [true, 'true', 1, '1'].includes(filesOnly),
			ignoreThreads: [true, 'true', 1, '1'].includes(ignoreThreads),
			ignoreDiscussion: [true, 'true', 1, '1'].includes(ignoreDiscussion),
			fromUsers: users,
		}));

		return API.v1.success({ count });
	},
});

API.v1.addRoute('rooms.info', { authRequired: true }, {
	get() {
		const room = findRoomByIdOrName({ params: this.requestParams() });
		const { fields } = this.parseJsonQuery();
		if (!Meteor.call('canAccessRoom', room._id, this.userId, {})) {
			return API.v1.failure('not-allowed', 'Not Allowed');
		}
		return API.v1.success({ room: Rooms.findOneByIdOrName(room._id, { fields }) });
	},
});

API.v1.addRoute('rooms.leave', { authRequired: true }, {
	post() {
		const room = findRoomByIdOrName({ params: this.bodyParams });
		Meteor.runAsUser(this.userId, () => {
			Meteor.call('leaveRoom', room._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.createDiscussion', { authRequired: true }, {
	post() {
		const { prid, pmid, reply, t_name, users, encrypted } = this.bodyParams;
		if (!prid) {
			return API.v1.failure('Body parameter "prid" is required.');
		}
		if (!t_name) {
			return API.v1.failure('Body parameter "t_name" is required.');
		}
		if (users && !Array.isArray(users)) {
			return API.v1.failure('Body parameter "users" must be an array.');
		}

		if (encrypted !== undefined && typeof encrypted !== 'boolean') {
			return API.v1.failure('Body parameter "encrypted" must be a boolean when included.');
		}

		const discussion = Meteor.runAsUser(this.userId, () => Meteor.call('createDiscussion', {
			prid,
			pmid,
			t_name,
			reply,
			users: users || [],
			encrypted,
		}));

		return API.v1.success({ discussion });
	},
});

API.v1.addRoute('rooms.getDiscussions', { authRequired: true }, {
	get() {
		const room = findRoomByIdOrName({ params: this.requestParams() });
		const { offset, count } = this.getPaginationItems();
		const { sort, fields, query } = this.parseJsonQuery();
		if (!Meteor.call('canAccessRoom', room._id, this.userId, {})) {
			return API.v1.failure('not-allowed', 'Not Allowed');
		}
		const ourQuery = Object.assign(query, { prid: room._id });

		const discussions = Rooms.find(ourQuery, {
			sort: sort || { fname: 1 },
			skip: offset,
			limit: count,
			fields,
		}).fetch();

		return API.v1.success({
			discussions,
			count: discussions.length,
			offset,
			total: Rooms.find(ourQuery).count(),
		});
	},
});

API.v1.addRoute('rooms.adminRooms', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();
		const { sort } = this.parseJsonQuery();
		const { types, filter } = this.requestParams();

		return API.v1.success(Promise.await(findAdminRooms({
			uid: this.userId,
			filter,
			types,
			pagination: {
				offset,
				count,
				sort,
			},
		})));
	},
});

API.v1.addRoute('rooms.adminRooms.getRoom', { authRequired: true }, {
	get() {
		const { rid } = this.requestParams();
		const room = Promise.await(findAdminRoom({
			uid: this.userId,
			rid,
		}));

		if (!room) {
			return API.v1.failure('not-allowed', 'Not Allowed');
		}
		return API.v1.success(room);
	},
});


API.v1.addRoute('rooms.autocomplete.channelAndPrivate', { authRequired: true }, {
	get() {
		const { selector } = this.queryParams;
		if (!selector) {
			return API.v1.failure('The \'selector\' param is required');
		}

		return API.v1.success(Promise.await(findChannelAndPrivateAutocomplete({
			uid: this.userId,
			selector: JSON.parse(selector),
		})));
	},
});

API.v1.addRoute('rooms.autocomplete.availableForTeams', { authRequired: true }, {
	get() {
		const { name } = this.queryParams;

		if (name && typeof name !== 'string') {
			return API.v1.failure('The \'name\' param is invalid');
		}

		return API.v1.success(Promise.await(findRoomsAvailableForTeams({
			uid: this.userId,
			name,
		})));
	},
});

API.v1.addRoute('rooms.saveRoomSettings', { authRequired: true }, {
	post() {
		const { rid, ...params } = this.bodyParams;

		const result = Meteor.runAsUser(this.userId, () => Meteor.call('saveRoomSettings', rid, params));

		return API.v1.success({ rid: result.rid });
	},
});

API.v1.addRoute('rooms.changeArchivationState', { authRequired: true }, {
	post() {
		const { rid, action } = this.bodyParams;

		let result;
		if (action === 'archive') {
			result = Meteor.runAsUser(this.userId, () => Meteor.call('archiveRoom', rid));
		} else {
			result = Meteor.runAsUser(this.userId, () => Meteor.call('unarchiveRoom', rid));
		}

		return API.v1.success({ result });
	},
});

API.v1.addRoute('rooms.export', { authRequired: true }, {
	post() {
		const { rid, type } = this.bodyParams;

		if (!rid || !type || !['email', 'file'].includes(type)) {
			throw new Meteor.Error('error-invalid-params');
		}

		if (!hasPermission(this.userId, 'mail-messages', rid)) {
			throw new Meteor.Error('error-action-not-allowed', 'Mailing is not allowed');
		}

		const room = Rooms.findOneById(rid);
		if (!room) {
			throw new Meteor.Error('error-invalid-room');
		}

		const user = Meteor.users.findOne({ _id: this.userId });

		if (!canAccessRoom(room, user)) {
			throw new Meteor.Error('error-not-allowed', 'Not Allowed');
		}

		if (type === 'file') {
			const { dateFrom, dateTo, format } = this.bodyParams;

			if (!['html', 'json'].includes(format)) {
				throw new Meteor.Error('error-invalid-format');
			}

			sendFile({
				rid,
				format,
				...dateFrom && { dateFrom: new Date(dateFrom) },
				...dateTo && { dateTo: new Date(dateTo) },
			}, user);
			return API.v1.success();
		}

		if (type === 'email') {
			const { toUsers, toEmails, subject, messages } = this.bodyParams;

			if ((!toUsers || toUsers.length === 0) && (!toEmails || toEmails.length === 0)) {
				throw new Meteor.Error('error-invalid-recipient');
			}

			if (messages.length === 0) {
				throw new Meteor.Error('error-invalid-messages');
			}

			const result = sendViaEmail({
				rid,
				toUsers,
				toEmails,
				subject,
				messages,
			}, user);

			return API.v1.success(result);
		}

		return API.v1.error();
	},
});
