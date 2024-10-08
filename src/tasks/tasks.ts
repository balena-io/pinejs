// These types were generated by @balena/abstract-sql-to-typescript v5.0.0

import type { Types } from '@balena/abstract-sql-to-typescript';

export interface Task {
	Read: {
		created_at: Types['Date Time']['Read'];
		modified_at: Types['Date Time']['Read'];
		id: Types['Big Serial']['Read'];
		key: Types['Short Text']['Read'] | null;
		is_created_by__actor: Types['Integer']['Read'];
		is_executed_by__handler: Types['Short Text']['Read'];
		is_executed_with__parameter_set: Types['JSON']['Read'] | null;
		is_scheduled_with__cron_expression: Types['Short Text']['Read'] | null;
		is_scheduled_to_execute_on__time: Types['Date Time']['Read'] | null;
		status: 'queued' | 'cancelled' | 'succeeded' | 'failed';
		started_on__time: Types['Date Time']['Read'] | null;
		ended_on__time: Types['Date Time']['Read'] | null;
		error_message: Types['Short Text']['Read'] | null;
		attempt_count: Types['Integer']['Read'];
		attempt_limit: Types['Integer']['Read'];
	};
	Write: {
		created_at: Types['Date Time']['Write'];
		modified_at: Types['Date Time']['Write'];
		id: Types['Big Serial']['Write'];
		key: Types['Short Text']['Write'] | null;
		is_created_by__actor: Types['Integer']['Write'];
		is_executed_by__handler: Types['Short Text']['Write'];
		is_executed_with__parameter_set: Types['JSON']['Write'] | null;
		is_scheduled_with__cron_expression: Types['Short Text']['Write'] | null;
		is_scheduled_to_execute_on__time: Types['Date Time']['Write'] | null;
		status: 'queued' | 'cancelled' | 'succeeded' | 'failed';
		started_on__time: Types['Date Time']['Write'] | null;
		ended_on__time: Types['Date Time']['Write'] | null;
		error_message: Types['Short Text']['Write'] | null;
		attempt_count: Types['Integer']['Write'];
		attempt_limit: Types['Integer']['Write'];
	};
}

export default interface $Model {
	task: Task;
}
