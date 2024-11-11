import type { ConfigLoader } from '../../../src/server-glue/module';

export default {
	models: [
		{
			apiRoot: 'example',
			modelFile: __dirname + '/example.sbvr',
			modelName: 'example',
		},
	],
	users: [
		{
			username: 'guest',
			password: ' ',
			permissions: [
				'example.device.all',
				'example.application.create',
				'example.application.read',
				'example.application.update',
				'example.gateway.read',
				'example.gateway__connects__device.all',
			],
		},
	],
} as ConfigLoader.Config;
