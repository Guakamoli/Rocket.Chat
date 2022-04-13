export type ContactRelation = 'F' | 'B' | 'D' | 'N'; // Follow, Both, Denial, None

export interface IContactUser {
	_id: string;
	username: string;
	name?: string;
	note?: string;
}

export interface IContact {
	_id: string;
	u: IContactUser;
	cu: IContactUser;
	name?: string;
	relation: ContactRelation;
	tags?: string[];
	ts: Date;
	favorite: boolean;
}
