import { Meteor } from 'meteor/meteor';
import mem from 'mem';

import { API } from '../../../../../app/api/server/api';
import { Contacts } from '../../models';

const SECRET = process.env.INTERNAL_X_SECRET || '';

const fields = {
	_id: 1,
	relation: 1,
	favorite: 1,
	ts: 1,
	blocked: 1,
	blocker: 1,
};

const getContactUserCached = mem((userId, username) => {
	const user = Meteor.users.findOne({ _id: userId, username }, {
		projection: { name: 1, 'customFields.note': 1 },
	});
	return {
		_id: userId,
		username,
		name: user?.name,
		note: user?.customFields?.note || '',
	};
}, { maxAge: 10000 });

API.v1.addRoute('contacts.add', { authRequired: true }, {
	post() {
		const { cuid } = this.bodyParams;
		if (this.userId === cuid) {
			throw new Meteor.Error('failed-follow', 'Can\'t to follow on yourself');
		}
		const cu = Meteor.users.findOne({ _id: String(cuid) });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}
		const contact = Contacts.findById(this.userId, cuid);
		if (contact?.blocked) {
			throw new Meteor.Error('failed-follow', 'You need to remove the user\'s attention after blocking it');
		}
		if (contact?.blocker) {
			throw new Meteor.Error('failed-follow', 'Due to the other\'s privacy settings, it cannot be follow');
		}

		if (cu?.customFields?.defaultChannel) {
			Meteor.runAsUser(this.userId, () => {
				Meteor.call('joinRoom', cu.customFields.defaultChannel);
			});
		}

		Contacts.createAndUpdate({ _id: this.userId, username: this.user.username }, {
			_id: cu._id,
			username: cu.username,
		});
		Contacts.updateBothById(this.userId, cu._id);

		return API.v1.success({ contact: Contacts.findById(this.userId, cu._id) });
	},
});

API.v1.addRoute('contacts.remove', { authRequired: true }, {
	post() {
		const { cuid } = this.bodyParams;
		const cu = Meteor.users.findOne({ _id: String(cuid) });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}
		if (cu?.customFields?.defaultChannel && this.user.__rooms.includes(cu?.customFields?.defaultChannel)) {
			Meteor.runAsUser(this.userId, () => {
				Meteor.call('leaveRoom', cu.customFields.defaultChannel);
			});
		}

		Contacts.updateRelationById(this.userId, cu._id, { relation: 'N' });
		Contacts.updateRelationById(cu._id, this.userId, { relation: 'F' });

		return API.v1.success({ contact: Contacts.findById(this.userId, cu._id) });
	},
});

API.v1.addRoute('contacts.list', { authRequired: true }, {
	get() {
		const u = this.user;
		const contacts = Contacts.all(u._id, {
			limit: 5000,
			fields: { ...fields, cu: 1 },
		}).fetch();
		if (contacts) {
			contacts.forEach((contact) => {
				const cu = getContactUserCached(contact.cu._id, contact.cu.username);
				if (cu) {
					contact.cu = cu;
				}
			});
		}

		return API.v1.success(contacts || []);
	},
});

API.v1.addRoute('contacts.fans', { authRequired: true }, {
	get() {
		const { offset, count = 10 } = this.getPaginationItems();
		const params = this.requestParams();
		let u = this.user;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		// TODO: CACHE: Add Breacking notice since we removed the query param
		const cursor = Contacts.allFansById(u._id, {
			sort: { ts: -1 },
			skip: offset,
			limit: count,
			fields: { ...fields, u: 1 },
		});

		const totalCount = cursor.count();
		const contacts = cursor.fetch();
		if (contacts) {
			contacts.forEach((contact) => {
				const cu = getContactUserCached(contact.u._id, contact.u.username);
				if (cu) {
					contact.cu = cu;
				}
				delete contact.u;
			});
		}

		return API.v1.success({
			contacts,
			offset,
			count: contacts.length,
			total: totalCount,
		});
	},
});

API.v1.addRoute('contacts.blocked', { authRequired: true }, {
	post() {
		const { cuid } = this.bodyParams;
		Meteor.call('kameoBlockContact', { cuid });
		return API.v1.success();
	},
});

API.v1.addRoute('contacts.unblock', { authRequired: true }, {
	post() {
		const { cuid } = this.bodyParams;
		Meteor.call('kameoUnblockContact', { cuid });
		return API.v1.success();
	},
});

API.v1.addRoute('contacts.blockers', { authRequired: true }, {
	get() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		const params = this.requestParams();
		let u = this.user;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const blockeds = Contacts.allBlockById(u._id, { fields: { ...fields, cu: 1, u: 1 } }).fetch();
		return API.v1.success(blockeds);
	},
});

API.v1.addRoute('contacts.blocker', { authRequired: true }, {
	get() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		const params = this.requestParams();
		let u;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		let cu;
		if (params.influencerId) {
			cu = Meteor.users.findOne({ _id: String(params.influencerId) });
			if (!cu) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const blocker = Contacts.findOne(
			{
				'u._id': u._id,
				'cu._id': cu._id,
				blocked: true,
			},
			{
				fields: { ...fields, u: 1, cu: 1 },
			},
		);

		return API.v1.success(blocker);
	},
});

API.v1.addRoute('contacts.followers', { authRequired: true }, {
	get() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		const params = this.requestParams();
		let u = this.user;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const contacts = Contacts.allFollowById(u._id, {
			limit: 5000,
			page: {
				...params,
			},
			fields: { ...fields, cu: 1 },
		}).fetch();
		if (contacts) {
			contacts.forEach((contact) => {
				const cu = getContactUserCached(contact.cu._id, contact.cu.username);
				if (cu) {
					contact.cu = cu;
				}
			});
		}

		return API.v1.success(contacts || []);
	},
});

API.v1.addRoute('contacts.blockeds', { authRequired: true }, {
	get() {
		const xSecret = this.request.headers['x-secret'] ?? '';
		if (SECRET !== xSecret) {
			return API.v1.failure('User not found');
		}

		const params = this.requestParams();
		let u = this.user;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const blockeds = Contacts.allBlockedById(u._id, { fields: { ...fields, cu: 1, u: 1 } }).fetch();
		return API.v1.success(blockeds);
	},
});
