/* eslint-disable no-await-in-loop */
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
import { UploadFileProp } from '../../../../definition/IMessage/MessageAttachment/Files/FileProp';
import { IUser } from '../../../../definition/IUser';
import { settings } from '../../../settings/server';

Meteor.methods({
	async sendFileMessage(roomId, _store, file, msgData = {}) {
		const user = Meteor.user() as IUser | undefined;
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'sendFileMessage' } as any);
		}
		const room = await Rooms.findOneById(roomId);
		if (user?.type !== 'app' && !canAccessRoom(room, user)) {
			return false;
		}
		const fileStore = FileUpload.getStore('Uploads');
		const fileList: Array<UploadFileProp> = Array.isArray(file) ? file : [file];
		check(msgData, {
			t: Match.Optional(String),
			_id: Match.Optional(String),
			avatar: Match.Optional(String),
			emoji: Match.Optional(String),
			alias: Match.Optional(String),
			groupable: Match.Optional(Boolean),
			msg: Match.Optional(String),
			tmid: Match.Optional(String),
			public: Match.Optional(Boolean),
		});
		const attachments: MessageAttachment[] = [];
		const files = [];
		for (const file of fileList) {
			const hasBuffer = !!file.fileBuffer;
			let fileId = file._id;
			if (!hasBuffer) {
				const details = {
					name: file.name,
					size: file.size,
					type: file.type,
					rid: roomId,
					userId: user._id,
					complete: true,
					uploading: false,
					progress: 1,
				};
				fileId = fileStore.store.create(details);
			} else {
				Uploads.updateFileComplete(fileId, user._id, _.omit(file, '_id'));
			}
			const fileUrl = file.uri || FileUpload.getPath(`${ file._id }/${ encodeURI(file.name) }`);
			files.push({
				_id: fileId,
				name: file.name,
				type: file.type,
			});
			if (/^image\/.+/.test(file.type)) {
				let imageUrl = fileUrl;
				if (!hasBuffer && settings.get('Message_Attachments_Thumbnails_Enabled')) {
					const width = settings.get('Message_Attachments_Thumbnails_Width');
					const height = settings.get('Message_Attachments_Thumbnails_Height');
					imageUrl = `${ fileUrl }?x-oss-process=image/resize,w_${ width },h_${ height },limit_0`;
				}
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: fileUrl,
					title_link_download: true,
					image_url: imageUrl,
					image_type: file.type,
					image_size: file.size,
					image_width: file.width,
					image_height: file.height,
				};

				if (file.identify && file.identify.size) {
					attachment.image_dimensions = file.identify.size;
				}
				if (hasBuffer) {
					try {
						attachment.image_preview = await FileUpload.resizeImagePreview(file);
						const thumbResult = await FileUpload.createImageThumbnail(file);
						if (thumbResult) {
							const { data: thumbBuffer, width, height } = thumbResult;
							const thumbnail = FileUpload.uploadImageThumbnail(file, thumbBuffer, roomId, user._id);
							const thumbUrl = FileUpload.getPath(`${ thumbnail._id }/${ encodeURI(file.name) }`);
							attachment.image_url = thumbUrl;
							attachment.image_type = thumbnail.type;
							attachment.image_dimensions = {
								width,
								height,
							};
							files.push({
								_id: thumbnail._id,
								name: file.name,
								type: thumbnail.type,
							});
						}
					} catch (e) {
						console.error(e);
					}
				}
				attachments.push(attachment);
			} else if (/^audio\/.+/.test(file.type)) {
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: fileUrl,
					title_link_download: true,
					audio_url: fileUrl,
					audio_type: file.type,
					audio_size: file.size,
				};
				attachments.push(attachment);
			} else if (/^video\/.+/.test(file.type)) {
				const videoCover = file.video_cover;
				const attachment: FileAttachmentProps = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: fileUrl,
					title_link_download: true,
					video_url: fileUrl,
					video_type: file.type,
					video_size: file.size,
					video_width: file.width,
					video_height: file.height,
				};
				if (videoCover) {
					const cover = !hasBuffer ? null : FileUpload.uploadImageThumbnail({ name: file.name, type: 'image/png' }, Buffer.from(videoCover), roomId, user._id);
					const coverType = !hasBuffer ? 'image/png' : cover.type;
					const coverName = file.name;
					attachment.video_cover_url = !hasBuffer ? videoCover : FileUpload.getPath(`${ cover._id }/${ encodeURI(file.name) }`);
					attachment.video_cover_type = coverType;
					attachment.video_cover_dimensions = {
						width: file.width,
						height: file.height,
					};
					let fileId = null;
					if (!hasBuffer) {
						const details = {
							name: coverName,
							size: 1,
							type: coverType,
							rid: roomId,
							userId: user._id,
							complete: true,
							uploading: false,
							progress: 1,
						};
						fileId = fileStore.store.create(details);
					} else {
						fileId = cover._id;
					}
					files.push({
						_id: fileId,
						name: coverName,
						type: coverType,
					});
				}
				attachments.push(attachment);
			} else {
				const attachment = {
					title: file.name,
					type: 'file',
					description: file.description,
					title_link: fileUrl,
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
