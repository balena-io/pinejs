import { sbvrUtils } from '../../../../../src/server-glue/module';

const addHook = (
	methods: Array<Parameters<typeof sbvrUtils.addPureHook>[0]>,
	resource: string,
	hook: sbvrUtils.Hooks,
) => {
	methods.map((method) => sbvrUtils.addPureHook(method, 'v3', resource, hook));
};

addHook(['PUT', 'POST', 'PATCH'], 'student', {
	async POSTPARSE({ request, api }) {
		const campusId = request.values.studies_at__campus;

		const resinApi = sbvrUtils.api.university.clone({
			passthrough: api.passthrough,
		});

		if (request.values.hasOwnProperty('studies_at__campus')) {
			const faculty = await resinApi.get({
				resource: 'faculty',
				id: campusId,
			});
			delete request.values.studies_at__campus;
			request.values.studies_at__faculty = faculty?.id;
		}
	},
});
