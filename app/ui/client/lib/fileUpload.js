import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';
import { Random } from 'meteor/random';

import { settings } from '../../../settings/client';
import { fileUploadIsValidContentType, APIClient } from '../../../utils';
import { prependReplies } from '../../../ui-utils';
import { imperativeModal } from '../../../../client/lib/imperativeModal';
import FileUploadModal from '../../../../client/components/modals/FileUploadModal';

export const uploadFileWithMessage = async (
	rid,
	tmid,
	{ description, fileName, msg, file, files },
) => {
	const data = new FormData();
	description && data.append('description', description);
	msg && data.append('msg', msg);
	tmid && data.append('tmid', tmid);
	for (const [index, item] of files.entries()) {
		data.append(`file[${ index }]`, item.file, item.fileName);
	}
	data.append('file', file.file, fileName);

	const uploads = Session.get('uploading') || [];

	const upload = {
		id: Random.id(),
		name: fileName,
		percentage: 0,
	};

	uploads.push(upload);
	Session.set('uploading', uploads);

	const { xhr, promise } = APIClient.upload(
		`v1/rooms.uploads/${ rid }`,
		{},
		data,
		{
			progress(progress) {
				const uploads = Session.get('uploading') || [];

				if (progress === 100) {
					return;
				}
				uploads
					.filter((u) => u.id === upload.id)
					.forEach((u) => {
						u.percentage = Math.round(progress) || 0;
					});
				Session.set('uploading', uploads);
			},
			error(error) {
				const uploads = Session.get('uploading') || [];
				uploads
					.filter((u) => u.id === upload.id)
					.forEach((u) => {
						u.error = error.message;
						u.percentage = 0;
					});
				Session.set('uploading', uploads);
			},
		},
	);

	Tracker.autorun((computation) => {
		const isCanceling = Session.get(`uploading-cancel-${ upload.id }`);
		if (!isCanceling) {
			return;
		}
		computation.stop();
		Session.delete(`uploading-cancel-${ upload.id }`);

		xhr.abort();

		const uploads = Session.get('uploading') || {};
		Session.set(
			'uploading',
			uploads.filter((u) => u.id !== upload.id),
		);
	});

	try {
		await promise;
		const uploads = Session.get('uploading') || [];
		return Session.set(
			'uploading',
			uploads.filter((u) => u.id !== upload.id),
		);
	} catch (error) {
		const uploads = Session.get('uploading') || [];
		uploads
			.filter((u) => u.id === upload.id)
			.forEach((u) => {
				u.error =					(error.xhr
						&& error.xhr.responseJSON
						&& error.xhr.responseJSON.error)
					|| error.message;
				u.percentage = 0;
			});
		Session.set('uploading', uploads);
	}
};

export const fileUpload = async (files, input, { rid, tmid }) => {
	const threadsEnabled = settings.get('Threads_enabled');

	files = [].concat(files);

	const replies = $(input).data('reply') || [];
	const mention = $(input).data('mention-user') || false;

	let msg = '';

	if (!mention || !threadsEnabled) {
		msg = await prependReplies('', replies, mention);
	}

	if (mention && threadsEnabled && replies.length) {
		tmid = replies[0]._id;
	}

	const uploadNextFile = () => {
		const file = files[0];
		if (!file) {
			return;
		}

		imperativeModal.open({
			component: FileUploadModal,
			props: {
				file: file.file,
				fileName: file.name,
				onClose: () => {
					imperativeModal.close();
					uploadNextFile();
				},
				onSubmit: (fileName, description) => {
					uploadFileWithMessage(rid, tmid, {
						description,
						fileName,
						msg: msg || undefined,
						file,
						files,
					});
					imperativeModal.close();
					// uploadNextFile();
				},
				isValidContentType:
					file.file.type && fileUploadIsValidContentType(file.file.type),
			},
		});
	};

	uploadNextFile();
};
