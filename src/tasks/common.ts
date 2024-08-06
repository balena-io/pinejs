import Ajv from 'ajv';

// Root path for the tasks API
export const apiRoot = 'tasks';

// Channel name for task insert notifications
export const channel = 'pinejs$task_insert';

export const ajv = new Ajv();
