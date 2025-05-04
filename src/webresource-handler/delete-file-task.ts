import { addTaskHandler } from '../tasks/index.js';
import { getWebresourceHandler } from './index.js';

const deleteFileSchema = {
	type: 'object',
	properties: {
		fileKey: {
			type: 'string',
		},
	},
	required: ['fileKey'],
	additionalProperties: false,
} as const;

export const addDeleteFileTaskHandler = () => {
	addTaskHandler(
		'delete_webresource_file',
		async (task) => {
			const handler = getWebresourceHandler();
			if (!handler) {
				return {
					error: 'Webresource handler not available',
					status: 'failed',
				};
			}

			try {
				await handler.removeFile(task.params.fileKey);
				return {
					status: 'succeeded',
				};
			} catch (error) {
				console.error('Error deleting file:', error);
				return {
					error: `${error}`,
					status: 'failed',
				};
			}
		},
		deleteFileSchema,
	);
};
