import { sbvrUtils } from '../../../src/server-glue/module';
import type * as Db from '../../../src/database-layer/db';

const client = new sbvrUtils.PinejsClient({
	apiPrefix: '/example/',
}) as sbvrUtils.LoggingClient;

// Task handler that creates a device using provided args.
sbvrUtils.addTaskHandler(
	'create_device',
	{
		name: 'string',
		type: 'string',
	},
	async (args: { name: string; type: string; tx: Db.Tx }) => {
		await client.post({
			resource: 'device',
			passthrough: {
				tx: args.tx,
			},
			body: {
				name: args.name,
				type: args.type,
			},
		});
	},
);

// Task handler that just throws an error.
// Used for testing error handling and retries.
sbvrUtils.addTaskHandler('throw_error', {}, () => {
	throw new Error('From throw_error task handler');
});
