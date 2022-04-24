import { FilterQuery, FindOneOptions } from 'mongodb';

import { BaseRaw } from '../../../../../app/models/server/raw/BaseRaw';
import { IContact } from '../../definition/IContact';

type T = IContact;

export class ContactsRaw extends BaseRaw<T> {
	findOneByUserId(uid: string, cuid: string, options: FindOneOptions<T> = {}): Promise<T | null> {
		const query = {
			'u._id': uid,
			'cu._id': cuid,
		};
		return this.findOne(query, options);
	}

	findOneByIdAndFollow(uid: string, cuid: string, options: FindOneOptions<T> = {}): Promise<T | null> {
		const query: FilterQuery<any> = {
			'u._id': uid,
			'cu._id': cuid,
			relation: {
				$in: ['F', 'B'],
			},
		};

		return this.findOne(query, options);
	}
}
