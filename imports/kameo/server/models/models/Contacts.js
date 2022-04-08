import { Base } from '../../../../../app/models/server';

export class Contacts extends Base {
	constructor() {
		super('contacts');
		this.tryEnsureIndex({ uid: 1 });
		this.tryEnsureIndex({ fuid: 1 });
		this.tryEnsureIndex({ ts: 1 }, { expireAfterSeconds: 2 * 60 * 60 });
		this.tryEnsureIndex({ block: 1 }, { sparse: true });
		this.tryEnsureIndex({ favorite: 1 }, { sparse: true });
	}

	create(uid, fuid) {
		const contact = {
			uid,
			fuid,
			ts: new Date(),
		};
		this.insert(contact);
	}

	removeById(uid, fuid) {
		const query = {
			uid,
			fuid,
		};
		this.deleteOne(query);
	}

	findById(uid, fuid) {
		const query = {
			uid,
			fuid,
		};
		return this.find(query);
	}

	findByIdAndBoth(uid, fuid) {
		const query = {
			$or: [
				{ uid, fuid },
				{ uid: fuid, fuid: uid },
			],
		};
		const count = this.find(query).count();
		return !!count && count === 2;
	}

	checkedBlocked(uid, fuid) {
		const query = {
			uid,
			fuid,
			block: {
				$in: ['both', 'from'],
			},
		};
		return this.findOne(query);
	}

	checkedTwowayBlocked(uid, fuid) {
		const query = {
			uid,
			fuid,
			block: 'both',
		};
		return this.findOne(query);
	}

	findContacts(uid) {
		const query = {
			uid,
			block: 'none',
		};
		return this.find(query);
	}
}

export default new Contacts();
