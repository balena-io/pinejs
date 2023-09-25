import { sbvrUtils } from '../../../../../src/server-glue/module';

const addHook = (
	methods: Array<Parameters<typeof sbvrUtils.addPureHook>[0]>,
	resource: string,
	hook: sbvrUtils.Hooks,
) => {
	methods.map((method) => sbvrUtils.addPureHook(method, 'v1', resource, hook));
};

addHook(['PUT', 'POST', 'PATCH'], 'student', {
	async POSTPARSE({ request }) {
		request.values.last_name = request.values.lastname;
		delete request.values.lastname;
	},
});
