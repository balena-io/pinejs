/**
 *
 * @param filePath The module to load
 * @param parentUrl Use import.meta.url
 * @returns
 */
export async function loadSBVR(filePath: string, meta: ImportMeta) {
	return await (
		await import('fs')
	).promises.readFile(new URL(meta.resolve(filePath)), 'utf8');
}

/**
 *
 * @param filePath The module to load
 * @param parentUrl Use `import.meta.url`
 * @returns The sbvr file contents
 */
export async function importSBVR(filePath: string, meta: ImportMeta) {
	return await (
		await import('fs')
	).promises.readFile(new URL(meta.resolve(filePath)), 'utf8');
}
