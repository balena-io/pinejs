import { sbvrUtils } from '@balena/pinejs';

// Since pine runs in a different process than the tests, we can't use spies,
// so we use a resource as a workaround for persistence outside of TXs.
export const track = async (content: string) => {
	return await sbvrUtils.api.example.post({
		resource: 'log',
		body: {
			content,
		},
	});
};
