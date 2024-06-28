import { expect } from 'chai';

export function assertExists(v: unknown): asserts v is NonNullable<typeof v> {
	expect(v).to.exist;
}
