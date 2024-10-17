import { expect } from 'chai';

export function assertExists(v: unknown): asserts v is NonNullable<typeof v> {
	expect(v).to.exist;
}

export const PINE_TEST_SIGNALS = {
	STOP_TASK_WORKER: 'PINEJS_TEST_STOP_TASK_WORKER',
	START_TASK_WORKER: 'PINEJS_TEST_START_TASK_WORKER',
};
