import * as odataMetadata from 'odata-openapi';
import type { generateODataMetadata } from './odata-metadata-generator';
import _ = require('lodash');
// tslint:disable-next-line:no-var-requires

export const generateODataMetadataAsOpenApi = (
	odataCsdl: ReturnType<typeof generateODataMetadata>,
	versionBasePathUrl = '',
	hostname = '',
) => {
	// console.log(`odataCsdl:${JSON.stringify(odataCsdl, null, 2)}`);
	const openAPIJson: any = odataMetadata.csdl2openapi(odataCsdl, {
		scheme: 'https',
		host: hostname,
		basePath: versionBasePathUrl,
		diagram: false,
		maxLevels: 5,
	});

	/**
	 * Manual rewriting OpenAPI specification to delete OData default functionality
	 * that is not implemented in Pinejs yet or is based on PineJs implements OData V3.
	 *
	 * Rewrite odata body response schema properties from `value: ` to `d: `
	 * Currently pinejs is returning `d: `
	 * https://www.odata.org/documentation/odata-version-2-0/json-format/ (6. Representing Collections of Entries)
	 * https://www.odata.org/documentation/odata-version-3-0/json-verbose-format/ (6.1 Response body)
	 *
	 * New v4 odata specifies the body response with `value: `
	 * http://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#sec_IndividualPropertyorOperationRespons
	 *
	 *
	 * Currently pinejs does not implement a $count=true query parameter as this would return the count of all rows returned as an additional parameter.
	 * This was not part of OData V3 and is new for OData V4. As the odata-openapi converte is opionionated on V4 the parameter is put into the schema.
	 * Until this is in parity with OData V4 pinejs needs to cleanup the `odata.count` key from the response schema put in by `csdl2openapi`
	 *
	 *
	 * Used oasis translator generates openapi according to v4 spec (`value: `)
	 *
	 * Unfortunantely odata-openapi does not export the genericFilter object.
	 * Using hardcoded generic filter description as used in odata-openapi code.
	 * Putting the genericFilter into the #/components/parameters/filter to reference it from paths
	 *
	 * */
	const parameters = openAPIJson?.components?.parameters;
	parameters['filter'] = {
		name: '$filter',
		description:
			'Filter items by property values, see [Filtering](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionfilter)',
		in: 'query',
		schema: {
			type: 'string',
		},
	};

	for (const idx of Object.keys(openAPIJson.paths)) {
		// rewrite `value: ` to `d: `
		const properties =
			openAPIJson?.paths[idx]?.get?.responses?.['200']?.content?.[
				'application/json'
			]?.schema?.properties;
		if (properties?.value) {
			properties['d'] = properties.value;
			delete properties.value;
		}

		// cleanup the `odata.count` key from the response schema
		if (properties?.['@odata.count']) {
			delete properties['@odata.count'];
		}

		// copy over 'delete' and 'patch' action from single entiy path
		// odata-openAPI converter does not support collection delete and collection update.
		// pinejs support collection delete and update with $filter parameter
		const entityCollectionPath = openAPIJson?.paths[idx];
		const singleEntityPath = openAPIJson?.paths[idx + '({id})'];
		if (entityCollectionPath != null && singleEntityPath != null) {
			const genericFilterParameterRef = {
				$ref: '#/components/parameters/filter',
			};
			for (const action of ['delete', 'patch']) {
				entityCollectionPath[action] = _.clone(singleEntityPath?.[action]);
				if (entityCollectionPath[action]) {
					entityCollectionPath[action]['parameters'] = [
						genericFilterParameterRef,
					];
				}
			}
		}
	}

	// cleanup $batch path as pinejs does not implement it.
	// http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_BatchRequests
	if (openAPIJson?.paths['/$batch']) {
		delete openAPIJson.paths['/$batch'];
	}

	return openAPIJson;
};
