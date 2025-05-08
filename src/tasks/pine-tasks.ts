import { tasks } from '../server-glue/module.js';
import { addDeleteFileTaskHandler } from '../webresource-handler/delete-file-task.js';

export const addPineTaskHandlers = () => {
	addDeleteFileTaskHandler();
	void tasks.worker?.start();
};
