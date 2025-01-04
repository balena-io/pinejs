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

addHook(['PUT', 'POST', 'PATCH'], 'student', {
	POSTPARSE({ request }) {
		request.values.last_name = request.values.lastname;
		delete request.values.lastname;
	},
});
