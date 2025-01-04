import { sbvrUtils } from '@balena/pinejs';

const addHook = (
	methods: Array<Parameters<typeof sbvrUtils.addPureHook>[0]>,
	resource: string,
	hook: sbvrUtils.Hooks,
) => {
	methods.map((method) => {
		sbvrUtils.addPureHook(method, 'v1', resource, hook);
	});
};

addHook(['PUT', 'POST', 'PATCH'], 'organization', {
	POSTPARSE({ request }) {
		if (request.values.other_image !== undefined) {
			request.values.logo_image = request.values.other_image;
			delete request.values.other_image;
		}
	},
});
