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
			phoneNumber: user?.services?.sms?.id, // 完整手机号
			realPhoneNumber: user?.services?.sms?.phoneNumber, // 无国别码的干净手机号
			countryCode: '+86', // 国别码
			verificationCodes: [],
		};
	} else {
		emails = user.emails;
	}
	// 开始组合 user 和 Account
	const addtionalUser = {
		username,
		emails,
		type: 'user',
		active: true,
		_updatedAt: user.createdAt,
		roles: [
			'user',
		],
		name: account.profile?.fullname || createName,
		nickname: account.profile?.fullname || createName,
		requirePasswordChange: false,
		settings: { },
		utcOffset: 8, // 用户时区，通过app登录可以修改
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
			let index = 0;
			while (index > pageCount) {
				const chatUsersCmd = chatUsers.slice(index * 1000, (index + 1) * 1000);
				await Users.insertMany(chatUsersCmd);
				index++;
			}
		}
		main().catch(console.error);
	},
});
