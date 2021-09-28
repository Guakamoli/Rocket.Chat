import fs from 'fs';

import { Migrations } from '../../../app/migrations';
import { Users } from '../../../app/models/server';

const MATCH_EMAIL_ADDRESS = /^\w+((\-\w+)|(\.\w+))*\@[a-zA-Z0-9][a-zA-Z0-9\-]{0,62}(\.[a-zA-Z0-9][a-zA-Z0-9\-]{0,62})+$/;

function binarySearch(arr, key, field) {
	return arr.find((item) => item[field] === key);
}

function createName() {
	const randomNumber = Math.random().toString().slice(-6);
	return `User-${ randomNumber }`;
}

function chatUserHandler(user) {
	const accountsBuf = fs.readFileSync('./Accounts.json');
	const accounts = JSON.parse(accountsBuf.toString('utf8'));
	const account = binarySearch(accounts, user._id, '_id');
	const username = user.emails[0].address;
	const smsService = {};
	let emails = [];
	if (!account) {
		return false;
	}

	if (!MATCH_EMAIL_ADDRESS.test(user.emails[0].address)) {
		smsService.sms = {
			realPhoneNumber: user?.services?.sms?.id, // 完整手机号
			purePhoneNumber: user?.services?.sms?.phoneNumber, // 无国别码的干净手机号
			countryCode: '+86', // 国别码
			verificationCodes: [],
		};
		emails = [];
	} else {
		emails = user?.emails && user.emails.map((rec) => ({
			...rec,
			verified: true,
		}));
	}

	if (user.services.resume && user.services.resume.loginTokens) {
		user.services.resume.loginTokens = user.services.resume.loginTokens.map((loginToken) => {
			loginToken.when = new Date(loginToken.when.$date);
			return loginToken;
		});
	}

	// 开始组合 user 和 Account
	const addtionalUser = {
		createdAt: new Date(user.createdAt.$date),
		username,
		emails,
		type: 'user',
		active: true,
		_updatedAt: new Date(user.createdAt.$date),
		roles: [
			'user',
		],
		name: account.profile?.fullname || createName,
		nickname: account.profile?.fullname || createName,
		requirePasswordChange: false,
		settings: {},
		utcOffset: 8, // 用户时区，通过app登录可以修改
		status: 'offline',
		statusConnection: 'offline',
	};
	delete user.services.email;
	const userService = {
		...user.services,
		...smsService,
	};

	return { ...user, ...addtionalUser, services: userService };
}

Migrations.add({
	version: 232,
	up() {
		const usersBuf = fs.readFileSync('./users.json');

		const users = JSON.parse(usersBuf.toString('utf8'));
		const chatUsers = users.map((user) => chatUserHandler(user)).filter((item) => item);
		const pageCount = Math.ceil(chatUsers.length / 1000);
		async function main() {
			const queue = [];
			let index = 0;
			while (index > pageCount) {
				const chatUsersCmd = chatUsers.slice(index * 1000, (index + 1) * 1000);
				// eslint-disable-next-line no-await-in-loop
				queue.push(Users.insertMany(chatUsersCmd));
				index++;
			}

			for await (const a of queue) {
				console.log('------------- a:', a);
			}
		}
		main().catch(console.error);
	},
});
