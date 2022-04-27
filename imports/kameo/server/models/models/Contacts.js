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
		this.tryEnsureIndex({ blocked: 1 });
		this.tryEnsureIndex({ blocker: 1 });
	}

	createAndUpdate(u, cu, options) {
		const contact = this.findById(u._id, cu._id);

		if (!contact) {
			this.create(u, cu, options);
		} else {
			this.updateRelationById(u._id, cu._id, { relation: 'F', ts: new Date(), ...options });
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

	findByIdAndFollowBoth(uid, cuid) {
		const query = {
			$or: [
				{ 'u._id': uid, 'cu._id': cuid, relation: 'B' },
				{ 'u._id': cuid, 'cu._id': uid, relation: 'B' },
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

	blockedUser(u, cu, options) {
		const contact = this.findById(u._id, cu._id);

		if (contact) {
			const modify = {
				$set: {
					...options,
				},
			};

			const query = { 'u._id': u._id, 'cu._id': cu._id };

			this.update(query, modify);
		} else {
			this.create(u, cu, options);
		}
	}

	unblockedUser(uid, cuid, options) {
		const modify = {
			$set: {
				...options,
			},
		};

		const query = { 'u._id': uid, 'cu._id': cuid };

		this.update(query, modify);
	}

	allBlockById(uid, options) {
		const query = {
			'u._id': uid,
			$or: [
				{ blocked: true },
				{ blocker: true },
			],
		};

		return this.find(query, options);
	}

	allBlockedById(uid, options) {
		const query = {
			'u._id': uid,
			blocked: true,
		};

		return this.find(query, options);
	}

	all(uid, options) {
		const query = {
			'u._id': uid,
		};
		return this.find(query, options);
	}
}

export default new Contacts();
