import { Meteor } from 'meteor/meteor';
import mem from 'mem';

import { API } from '../../../../../app/api/server/api';
import { Contacts } from '../../models';

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
		const cu = Meteor.users.findOne({ _id: String(cuid) });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}
		if (cu?.customFields?.defaultChannel) {
			Meteor.runAsUser(this.userId, () => {
				Meteor.call('joinRoom', cu.customFields.defaultChannel);
			});
		}

		Contacts.createAndUpdate({ _id: this.userId, username: this.user.username }, { _id: cu._id, username: cu.username });
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
		if (cu?.customFields?.defaultChannel) {
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
			fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 },
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
			fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 },
		});

		const totalCount = cursor.count();
		const contacts = cursor.fetch();
		if (contacts) {
			contacts.forEach((contact) => {
				const cu = getContactUserCached(contact.cu._id, contact.cu.username);
				if (cu) {
					contact.cu = cu;
				}
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

		const cu = Meteor.users.findOne({ _id: String(cuid) });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		Contacts.blockedUser(this.userId, cu._id, { relation: 'D' });

		return API.v1.success();
	},
});

API.v1.addRoute('contacts.unblock', { authRequired: true }, {
	post() {
		const { cuid } = this.bodyParams;

		const cu = Meteor.users.findOne({ _id: String(cuid) });
		if (!cu) {
			throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
		}

		const contact = Contacts.findById(this.userId, cu._id);
		if (contact && contact.relation === 'D') {
			Contacts.updateRelationById(this.userId, cu._id, { relation: 'N' });
		}

		return API.v1.success();
	},
});

API.v1.addRoute('contacts.blockers', { authRequired: true }, {
	get() {
		const params = this.requestParams();
		let u = this.user;
		if (params.userId) {
			u = Meteor.users.findOne({ _id: String(params.userId) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const blockers = Contacts.allBlockerById(u._id, { fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 } }).fetch();

		return API.v1.success(blockers || []);
	},
});
