import { NotFoundError } from '../../../../../src/sbvr-api/errors';
import { sbvrUtils } from '../../../../../src/server-glue/module';

const addHook = (
	methods: Array<Parameters<typeof sbvrUtils.addPureHook>[0]>,
	resource: string,
	hook: sbvrUtils.Hooks,
) => {
	methods.map((method) => sbvrUtils.addPureHook(method, 'v2', resource, hook));
};

addHook(['PUT', 'POST', 'PATCH'], 'student', {
	async POSTPARSE({ request, api }) {
		if (
			Object.prototype.hasOwnProperty.call(request.values, 'studies_at__campus')
		) {
			const resinApi = sbvrUtils.api['v3'].clone({
				passthrough: api.passthrough,
			});

			const campus = await resinApi.get({
				resource: 'campus',
				id: { name: request.values.studies_at__campus },
			});

			if (campus == null) {
				throw new NotFoundError(
					`Campus with name '${request.values.studies_at__campus}' does not exist`,
				);
			}
			delete request.values.studies_at__campus;
			request.values.studies_at__campus = campus?.id;
		}
	},
});
