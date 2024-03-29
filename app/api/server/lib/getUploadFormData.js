import Busboy from 'busboy';

export const getUploadFormData = async ({ request }) => new Promise((resolve, reject) => {
	const busboy = new Busboy({ headers: request.headers });

	const fields = {};

	busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
		const fileData = [];

		file.on('data', (data) => fileData.push(data));

		file.on('end', () => {
			if (fields.hasOwnProperty(fieldname)) {
				return reject('Just 1 file is allowed');
			}

			fields[fieldname] = { file, filename, encoding, mimetype, fileBuffer: Buffer.concat(fileData) };
		});
	});

	busboy.on('field', (fieldname, value) => {
		if (/^[a-zA-Z0-9]+\[(0|[1-9][0-9]*){0,1}\]$/.test(fieldname)) {
			if (!fields[fieldname]) {
				fields[fieldname] = [];
			}
			fields[fieldname].push(value);
			return;
		}
		fields[fieldname] = value;
	});

	busboy.on('finish', () => resolve(fields));

	request.pipe(busboy);
});
