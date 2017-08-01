export = (sql: string, nextBindFn: () => string) => {
	let newSql = ''
	let startQuote: false | "'" | '"' = false
	let i = 0
	const length = sql.length
	while (i < length) {
		let c = sql[i]
		i++
		if (startQuote !== false) {
			if (c === '\\' || (c === startQuote && sql[i] === startQuote)) {
				// The quote is escaped, so we swallow it and move to the next char (which also gets swallowed).
				newSql += c
				c = sql[i] || ''
				i++
			} else if (c === startQuote) {
				// The quote is closed, so we start checking for ? again
				startQuote = false
			}
			newSql += c
		} else if (c === "'" || c === '"') {
			// Check if the current character is a quote char,
			// and if so mark it as such so we ignore any ? until the quote is closed.
			startQuote = c
			newSql += c
		} else if (c === '?') {
			// We found a binding, so call the nextBindFn to find the correct replacement
			newSql += nextBindFn()
		} else {
			// Anything left should just be kept as-is
			newSql += c
		}
	}
	return newSql
}
