import { sbvrUtils } from '@balena/pinejs';

const addHook = (
	methods: Array<Parameters<typeof sbvrUtils.addPureHook>[0]>,
	resource: string,
	hook: sbvrUtils.Hooks,
) => {
	methods.map((method) => {
		sbvrUtils.addPureHook(method, 'v1actionsUniversity', resource, hook);
	});
};

addHook(['PUT', 'POST', 'PATCH'], 'student', {
	POSTPARSE({ request }) {
		if (request.values.current_semester !== undefined) {
			request.values.semester = request.values.current_semester;
			delete request.values.current_semester;
		}
	},
});
