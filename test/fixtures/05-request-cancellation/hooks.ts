import { setTimeout } from 'timers/promises';
import { sbvrUtils } from '../../../out/server-glue/module';
import { track } from './util';

sbvrUtils.addPureHook('POST', 'example', 'slow_resource', {
	async POSTRUN({ request, api }) {
		await track('POST slow_resource POSTRUN started');

		await api.patch({
			resource: 'slow_resource',
			options: {
				$filter: { id: { $in: request.affectedIds! } },
			},
			body: {
				note: 'I got updated after the slow POSTRUN',
			},
		});
		await track('POST slow_resource POSTRUN updated the note once');

		await setTimeout(300);
		await track('POST slow_resource POSTRUN spent some time waiting');

		await api.patch({
			resource: 'slow_resource',
			options: {
				$filter: { id: { $in: request.affectedIds! } },
			},
			body: {
				note: 'I got updated twice after the slow POSTRUN',
			},
		});
		await track('POST slow_resource POSTRUN updated the note again');

		await track('POST slow_resource POSTRUN finished');
	},
	async PRERESPOND() {
		await track('POST slow_resource PRERESPOND');
	},
	async 'POSTRUN-ERROR'() {
		await track('POST slow_resource POSTRUN-ERROR');
	},
});
