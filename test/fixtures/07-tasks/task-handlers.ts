import { sbvrUtils } from '../../../src/server-glue/module';

const client = new sbvrUtils.PinejsClient({
	apiPrefix: '/example/',
}) as sbvrUtils.LoggingClient;

// Task handler that creates a record using the args.
sbvrUtils.addTaskHandler(
	'foobar',
	{
		name: 'string',
		type: 'string',
	},
	async (args: { name: string; type: string }) => {
		await client.post({
			resource: 'device',
			body: {
				name: args.name,
				type: args.type,
			},
		});
	},
);
