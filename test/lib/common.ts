import { expect } from 'chai';
import { setTimeout } from 'node:timers/promises';

export function assertExists(v: unknown): asserts v is NonNullable<typeof v> {
	expect(v).to.exist;
}

export const PINE_TEST_SIGNALS = {
	STOP_TASK_WORKER: 'PINEJS_TEST_STOP_TASK_WORKER',
	START_TASK_WORKER: 'PINEJS_TEST_START_TASK_WORKER',
};

export async function waitFor(
	checkFn: () => Promise<boolean>,
	intervalMS = 100,
	maxCount = 10,
): Promise<void> {
	for (let i = 1; i <= maxCount; i++) {
		console.log(`Waiting (${i}/${maxCount})...`);
		await setTimeout(intervalMS);
		if (await checkFn()) {
			return;
		}
	}
	throw new Error('waitFor timed out');
}
