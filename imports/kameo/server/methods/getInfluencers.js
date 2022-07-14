import { Meteor } from 'meteor/meteor';

import { hasPermission } from '../../../../app/authorization';
import { Users } from '../../../../app/models';
import { getFederationDomain } from '../../../../app/federation/server/lib/getFederationDomain';
import { isFederationEnabled } from '../../../../app/federation/server/lib/isFederationEnabled';
import { federationSearchUsers } from '../../../../app/federation/server/handler';

Meteor.methods({
	getInfluencers(text, workspace, sort, pagination) {
		const user = Meteor.user();
		if (!user || !hasPermission(user._id, 'view-outside-room') || !hasPermission(user._id, 'view-d-room')) {
			return;
		}

		const forcedSearchFields = workspace === 'all' && ['name'];

		const viewFullOtherUserInfo = hasPermission(user._id, 'view-full-other-user-info');

		const options = {
			...pagination,
			sort,
			fields: {
				username: 1,
				name: 1,
				nickname: 1,
				bio: 1,
				createdAt: 1,
				...viewFullOtherUserInfo && { emails: 1 },
				federation: 1,
				avatarETag: 1,
				customFields: 1,
				gender: 1,
				labels: 1,
			},
		};

		const extraQuery = [{
			roles: { $in: ['influencer', 'creator'] },
		}];
		let result;
		if (workspace === 'all') {
			result = Users.findByActiveUsersExcept(text, [], options, forcedSearchFields, extraQuery);
		} else if (workspace === 'external') {
			result = Users.findByActiveExternalUsersExcept(text, [], options, forcedSearchFields, getFederationDomain());
		} else {
			result = Users.findByActiveLocalUsersExcept(text, [], options, forcedSearchFields, getFederationDomain());
		}

		const total = result.count(); // count ignores the `skip` and `limit` options
		const results = result.fetch();

		// Try to find federated users, when applicable
		if (isFederationEnabled() && workspace === 'external' && text.indexOf('@') !== -1) {
			const users = federationSearchUsers(text);

			for (const user of users) {
				if (results.find((e) => e._id === user._id)) {
					continue;
				}

				// Add the federated user to the results
				results.unshift({
					username: user.username,
					name: user.name,
					bio: user.bio,
					nickname: user.nickname,
					emails: user.emails,
					federation: user.federation,
					isRemote: true,
				});
			}
		}

		return {
			total,
			results,
		};
	},
});
