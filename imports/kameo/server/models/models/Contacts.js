import { Base } from '../../../../../app/models/server';

export class Contacts extends Base {
	constructor() {
		super('contacts');
		this.tryEnsureIndex({ 'u._id': 1 });
		this.tryEnsureIndex({ 'u.username': 1 });
		this.tryEnsureIndex({ 'cu._id': 1 });
		this.tryEnsureIndex({ 'cu.username': 1 });
		this.tryEnsureIndex({ relation: 1 });
		this.tryEnsureIndex({ ts: 1 });
		this.tryEnsureIndex({ favorite: 1 });
	}

	createAndUpdate(u, cu, options) {
		const contact = this.findById(u._id, cu._id);

		if (!contact) {
			this.create(u, cu, options);
		} else {
			this.updateRelationById(u._id, cu._id, { relation: 'F', ts: new Date(), ...options });
		}
	}

	blockedUser(u, cu, options) {
		const contact = this.findById(u._id, cu._id);

		if (!contact) {
			this.create(u, cu, options);
		} else {
			this.updateRelationById(cu._id, u._id, { relation: 'N' });
			this.updateRelationById(u._id, cu._id, { relation: 'D' });
		}
	}

	create(u, cu, options) {
		const contact = {
			u,
			cu,
			relation: 'F',
			favorite: false,
			ts: new Date(),
			tags: [],
			...options,
		};
		this.insert(contact);
	}

	updateRelationById(uid, cuid, options) {
		const { relation, ts } = options;
		const query = {
			'u._id': uid,
			'cu._id': cuid,
		};

		const modify = {
			$set: { relation, ts },
		};
		this.update(query, modify);
	}

	findById(uid, cuid, options) {
		const query = {
			'u._id': uid,
			'cu._id': cuid,
		};
		return this.findOne(query, options);
	}

	findByIdAndFollow(uid, cuid) {
		const query = {
			$or: [
				{ 'u._id': uid, 'cu._id': cuid, relation: 'F' },
				{ 'u._id': cuid, 'cu._id': uid, relation: 'F' },
			],
		};
		const count = this.find(query).count();
		return !!count && count === 2;
	}

	checkedBlocked(uid, cuid) {
		const query = {
			'u._id': uid,
			'cu._id': cuid,
			relation: 'D',
		};
		return this.findOne(query);
	}

	allFollowById(uid, options) {
		const query = {
			'u._id': uid,
			relation: {
				$in: ['B', 'F'],
			},
		};
		if (options.page.offset) {
			query._id = { $gte: options.page.offset };
		}
		return this.find(query, options);
	}

	allFansById(uid, options) {
		const query = {
			'cu._id': uid,
			relation: {
				$in: ['B', 'F'],
			},
		};
		return this.find(query, options);
	}

	updateBothById(uid, cuid) {
		const isFollow = this.findByIdAndFollow(uid, cuid);
		if (isFollow) {
			Promise.await(this.model.rawCollection().updateMany(
				{
					$or: [
						{
							'u._id': uid,
							'cu._id': cuid,
							relation: 'F',
						},
						{
							'u._id': cuid,
							'cu._id': uid,
							relation: 'F',
						},

					],
				},
				{
					$set: {
						relation: 'B',
					},
				},
			));
		}
	}

	allBlockerById(uid, options) {
		const query = {
			'u._id': uid,
			relation: 'D',
		};

		return this.find(query, options);
	}
}

export default new Contacts();
