/* eslint-disable @typescript-eslint/camelcase */
import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import _ from 'underscore';

import { Uploads } from '../../../models/server';
import { Rooms } from '../../../models/server/raw';
import { callbacks } from '../../../callbacks/server';
import { FileUpload } from '../lib/FileUpload';
import { canAccessRoom } from '../../../authorization/server/functions/canAccessRoom';
import { MessageAttachment } from '../../../../definition/IMessage/MessageAttachment/MessageAttachment';
import { FileAttachmentProps } from '../../../../definition/IMessage/MessageAttachment/Files/FileAttachmentProps';
import { IUser } from '../../../../definition/IUser';

Meteor.methods({
	async sendUploadedFileMessage(roomId, filesList = [], msgData = {}) {
		const user = Meteor.user() as IUser | undefined;
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'sendFileMessage' } as any);
		}

		const room = await Rooms.findOneById(roomId);

		if (user?.type !== 'app' && !canAccessRoom(room, user)) {
			return false;
		}
		check(msgData, {
			t: Match.Optional(String),
			avatar: Match.Optional(String),
			emoji: Match.Optional(String),
			alias: Match.Optional(String),
			groupable: Match.Optional(Boolean),
			msg: Match.Optional(String),
			tmid: Match.Optional(String),
		});
		const attachments: MessageAttachment[] = [];
		const files = [];
		const coverMap = {};
		for (const file of filesList) {
			if (file?.extra?.relative_video) {
				coverMap[file.extra.relative_video] = file;
				continue;
			}
		}
		for (const file of filesList) {
			files.push({
				_id: file.extra.file_id,
				name: file.name,
				type: file.type,
			});
			Uploads.updateFileComplete(file.extra.file_id, user._id, _.omit(file, 'extra'));
			if (file?.extra?.relative_video) {
				continue;
			}
			if (/^image\/.+/.test(file.type)) {
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: file.fileUrl,
					title_link_download: true,
					image_url: file.fileUrl,
					image_type: file.type,
					image_size: file.size,
				};

				if (file.identify && file.identify.size) {
					attachment.image_dimensions = file.identify.size;
				}
			} else if (/^audio\/.+/.test(file.type)) {
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: file.fileUrl,
					title_link_download: true,
					audio_url: file.fileUrl,
					audio_type: file.type,
					audio_size: file.size,
				};
				attachments.push(attachment);
			} else if (/^video\/.+/.test(file.type)) {
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: file.fileUrl,
					title_link_download: true,
					video_url: file.fileUrl,
					video_type: file.type,
					video_size: file.size,
					video_width: file.width,
					video_height: file.height,
				};
				const videoCover = coverMap[attachment.name];
				if (videoCover) {
					attachment.video_cover_url = videoCover.fileUrl;
					attachment.video_cover_type = videoCover.type;
					attachment.video_cover_dimensions = {
						width: file.width,
						height: file.height,
					};
				}
				attachments.push(attachment);
			} else {
				const attachment = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: file.fileUrl,
					title_link_download: true,
				};
				attachments.push(attachment);
			}
		}

		const msg = Meteor.call('sendMessage', {
			rid: roomId,
			ts: new Date(),
			msg: '',
			file: files[0],
			files,
			groupable: false,
			attachments,
			...msgData,
		});

		callbacks.runAsync('afterFileUpload', { user, room, message: msg });

		return msg;
	},
});
