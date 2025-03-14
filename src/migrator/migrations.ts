// These types were generated by @balena/abstract-sql-to-typescript v5.1.0

import type { Types } from '@balena/abstract-sql-to-typescript';

export interface Migration {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		model_name: Types['Short Text']['Read'];
		executed_migrations: Types['JSON']['Read'];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		model_name: Types['Short Text']['Write'];
		executed_migrations: Types['JSON']['Write'];
	};
}

export interface MigrationLock {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		model_name: Types['Short Text']['Read'];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		model_name: Types['Short Text']['Write'];
	};
}

export interface MigrationStatus {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		migration_key: Types['Short Text']['Read'];
		start_time: Types['Date Time']['Read'] | null;
		last_run_time: Types['Date Time']['Read'] | null;
		run_count: Types['Integer']['Read'];
		migrated_row_count: Types['Integer']['Read'] | null;
		error_count: Types['Integer']['Read'] | null;
		is_backing_off: Types['Boolean']['Read'];
		converged_time: Types['Date Time']['Read'] | null;
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		migration_key: Types['Short Text']['Write'];
		start_time: Types['Date Time']['Write'] | null;
		last_run_time: Types['Date Time']['Write'] | null;
		run_count: Types['Integer']['Write'];
		migrated_row_count: Types['Integer']['Write'] | null;
		error_count: Types['Integer']['Write'] | null;
		is_backing_off: Types['Boolean']['Write'];
		converged_time: Types['Date Time']['Write'] | null;
	};
}

export default interface $Model {
	migration: Migration;
	migration_lock: MigrationLock;
	migration_status: MigrationStatus;
}
