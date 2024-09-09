// These types were generated by @balena/abstract-sql-to-typescript v4.0.3

import type { Types } from '@balena/abstract-sql-to-typescript';

export interface Permission {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		name: Types['Text']['Read'];
		is_of__role?: Array<RoleHasPermission['Read']>;
		is_of__user?: Array<UserHasPermission['Read']>;
		is_of__api_key?: Array<ApiKeyHasPermission['Read']>;
		user__has__permission?: Array<UserHasPermission['Read']>;
		user_permission?: Array<UserHasPermission['Read']>;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
		name: Types['Text']['Write'];
	};
}

export interface Role {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		name: Types['Text']['Read'];
		role__has__permission?: Array<RoleHasPermission['Read']>;
		user__has__role?: Array<UserHasRole['Read']>;
		user_role?: Array<UserHasRole['Read']>;
		is_of__user?: Array<UserHasRole['Read']>;
		is_of__api_key?: Array<ApiKeyHasRole['Read']>;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
		name: Types['Text']['Write'];
	};
}

export interface RoleHasPermission {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		role: { __id: Role['Read']['id'] } | [Role['Read']];
		permission: { __id: Permission['Read']['id'] } | [Permission['Read']];
		id: Types['Serial']['Read'];
		is_of__role: { __id: Role['Read']['id'] } | [Role['Read']];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		role: Role['Write']['id'];
		permission: Permission['Write']['id'];
		id: Types['Serial']['Write'];
	};
}

export interface Actor {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		is_of__user?: Array<User['Read']>;
		api_key?: Array<ApiKey['Read']>;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
	};
}

export interface User {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		actor: { __id: Actor['Read']['id'] } | [Actor['Read']];
		username: Types['Short Text']['Read'];
		password: Types['Hashed']['Read'];
		user__has__role?: Array<UserHasRole['Read']>;
		user_role?: Array<UserHasRole['Read']>;
		user__has__permission?: Array<UserHasPermission['Read']>;
		user_permission?: Array<UserHasPermission['Read']>;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
		actor: Actor['Write']['id'];
		username: Types['Short Text']['Write'];
		password: Types['Hashed']['Write'];
	};
}

export interface UserHasRole {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		user: { __id: User['Read']['id'] } | [User['Read']];
		role: { __id: Role['Read']['id'] } | [Role['Read']];
		id: Types['Serial']['Read'];
		expiry_date: Types['Date Time']['Read'] | null;
		is_of__user: { __id: User['Read']['id'] } | [User['Read']];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		user: User['Write']['id'];
		role: Role['Write']['id'];
		id: Types['Serial']['Write'];
		expiry_date: Types['Date Time']['Write'] | null;
	};
}

export interface UserHasPermission {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		user: { __id: User['Read']['id'] } | [User['Read']];
		permission: { __id: Permission['Read']['id'] } | [Permission['Read']];
		id: Types['Serial']['Read'];
		expiry_date: Types['Date Time']['Read'] | null;
		is_of__user: { __id: User['Read']['id'] } | [User['Read']];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		user: User['Write']['id'];
		permission: Permission['Write']['id'];
		id: Types['Serial']['Write'];
		expiry_date: Types['Date Time']['Write'] | null;
	};
}

export interface ApiKey {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Serial']['Read'];
		key: Types['Short Text']['Read'];
		expiry_date: Types['Date Time']['Read'] | null;
		is_of__actor: { __id: Actor['Read']['id'] } | [Actor['Read']];
		name: Types['Text']['Read'] | null;
		description: Types['Text']['Read'] | null;
		api_key__has__role?: Array<ApiKeyHasRole['Read']>;
		api_key__has__permission?: Array<ApiKeyHasPermission['Read']>;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Serial']['Write'];
		key: Types['Short Text']['Write'];
		expiry_date: Types['Date Time']['Write'] | null;
		is_of__actor: Actor['Write']['id'];
		name: Types['Text']['Write'] | null;
		description: Types['Text']['Write'] | null;
	};
}

export interface ApiKeyHasRole {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		api_key: { __id: ApiKey['Read']['id'] } | [ApiKey['Read']];
		role: { __id: Role['Read']['id'] } | [Role['Read']];
		id: Types['Serial']['Read'];
		is_of__api_key: { __id: ApiKey['Read']['id'] } | [ApiKey['Read']];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		api_key: ApiKey['Write']['id'];
		role: Role['Write']['id'];
		id: Types['Serial']['Write'];
	};
}

export interface ApiKeyHasPermission {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		api_key: { __id: ApiKey['Read']['id'] } | [ApiKey['Read']];
		permission: { __id: Permission['Read']['id'] } | [Permission['Read']];
		id: Types['Serial']['Read'];
		is_of__api_key: { __id: ApiKey['Read']['id'] } | [ApiKey['Read']];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		api_key: ApiKey['Write']['id'];
		permission: Permission['Write']['id'];
		id: Types['Serial']['Write'];
	};
}

export default interface $Model {
	permission: Permission;
	role: Role;
	role__has__permission: RoleHasPermission;
	actor: Actor;
	user: User;
	user__has__role: UserHasRole;
	user__has__permission: UserHasPermission;
	api_key: ApiKey;
	api_key__has__role: ApiKeyHasRole;
	api_key__has__permission: ApiKeyHasPermission;
	// Synonyms
	user_role: UserHasRole;
	user_permission: UserHasPermission;
}
