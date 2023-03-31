import * as odataMetadata from 'odata-openapi';
import { generateODataMetadata } from './odata-metadata-generator';
// tslint:disable-next-line:no-var-requires

export const generateODataMetadataAsOpenApi = (
	odataCsdl: ReturnType<typeof generateODataMetadata>,
	versionBasePathUrl: string = '',
	hostname: string = '',
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
	 */

	Object.keys(openAPIJson.paths).forEach((i) => {
		// rewrite `value: ` to `d: `
		if (
			openAPIJson?.paths[i]?.get?.responses?.['200']?.content?.[
				'application/json'
			]?.schema?.properties?.value
		) {
			openAPIJson.paths[i].get.responses['200'].content[
				'application/json'
			].schema.properties['d'] =
				openAPIJson.paths[i].get.responses['200'].content[
					'application/json'
				].schema.properties.value;
			delete openAPIJson.paths[i].get.responses['200'].content[
				'application/json'
			].schema.properties.value;
		}

		// cleanup the `odata.count` key from the response schema
		if (
			openAPIJson?.paths[i]?.get?.responses?.['200']?.content?.[
				'application/json'
			]?.schema?.properties?.['@odata.count']
		) {
			delete openAPIJson.paths[i].get.responses['200'].content[
				'application/json'
			].schema.properties['@odata.count'];
		}
	});

	// cleanup $batch path as pinejs does not implement it.
	// http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_BatchRequests
	if (openAPIJson?.paths['/$batch']) {
		delete openAPIJson.paths['/$batch'];
	}

	return openAPIJson;
};
