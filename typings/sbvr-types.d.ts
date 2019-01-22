declare module '@resin/sbvr-types' {
	import * as Promise from 'bluebird';

	const sbvrTypes: {
		Hashed: {
			compare: (str: string, hash: string) => Promise<boolean>;
		};
		[fieldType: string]: {
			types: {
				odata: {
					name: string;
					complexType?: string;
				};
			};
		};
	};
	export = sbvrTypes;
}
