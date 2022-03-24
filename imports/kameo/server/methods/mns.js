import { Meteor } from 'meteor/meteor';

import { Logger } from '../../../../app/logger';
import { httpPost } from '../utils';

const logger = new Logger('MNS', {});

const MNS_SERVICE_URL = process.env.MNS_SERVICE_URL || 'http://mns-svc:8080';

Meteor.methods({
	kameoMNSSend: (data) => {
		logger.debug('kameoMNSSend data->', data);
		const response = httpPost(MNS_SERVICE_URL, { data });
		logger.debug('kameoMNSSend response->', response);
	},
});
