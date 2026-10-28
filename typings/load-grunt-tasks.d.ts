declare module 'load-grunt-tasks' {
	import type * as Grunt from 'grunt';

	function loadGruntTasks(grunt: typeof Grunt): void;
	export = loadGruntTasks;
}
