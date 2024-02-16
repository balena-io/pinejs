declare module 'odata-openapi' {
	export const csdl2openapi: (
		csdl,
		{ scheme, host, basePath, diagram, maxLevels } = {},
	) => object;
}
