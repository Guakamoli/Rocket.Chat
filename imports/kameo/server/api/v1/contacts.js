import { Meteor } from 'meteor/meteor';

import { API } from '../../../../../app/api/server/api';
import { Contacts } from '../../models';

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

		return API.v1.success();
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
				Meteor.call('removeUserFromRoom', { rid: cu.customFields.defaultChannel, username: this.user.username });
			});
		}

		Contacts.updateRelationById(this.userId, cu._id, { relation: 'N' });
		Contacts.updateRelationById(cu._id, this.userId, { relation: 'F' });

		return API.v1.success();
	},
});

API.v1.addRoute('contacts.list', { authRequired: true }, {
	get() {
		const params = this.requestParams();
		const contacts = Contacts.allFollowById(this.userId, {
			first: 5000,
			page: {
				...params,
			},
			fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 },
		}).fetch();

		return API.v1.success(contacts || []);
	},
});

API.v1.addRoute('contacts.fans', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();

		// TODO: CACHE: Add Breacking notice since we removed the query param
		const cursor = Contacts.allFansById(this.userId, {
			sort: { ts: -1 },
			skip: offset,
			limit: count,
			fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 },
		});

		const totalCount = cursor.count();
		const contacts = cursor.fetch();

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
		if (params.uid) {
			u = Meteor.users.findOne({ _id: String(params.uid) });
			if (!u) {
				throw new Meteor.Error('error-invalid-user', 'The required "userId" or "username" param provided does not match any users');
			}
		}

		const blockers = Contacts.allBlockerById(u._id, { fields: { _id: 1, cu: 1, relation: 1, favorite: 1, ts: 1 } }).fetch();

		return API.v1.success(blockers || []);
	},
});
