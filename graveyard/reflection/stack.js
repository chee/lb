/**
 * @param {string} stack
 * @returns
 */
export default function parseStack(stack) {
	if (stack.match(/^\s*at .*(\S+:\d+|\(native\))/m)) {
		return parseV8(stack)
	}
	return parseGeckoWebkit(stack)
}

/**
 * @param {string} stack
 */
function parseV8(stack) {
	return stack
		.split("\n")
		.slice(1)
		.map(line => {
			const match = line.match(/ \((.+):(\d+):(\d+)\)/)
			if (match) {
				return {
					source: match[2],
					line: parseInt(match[3], 10),
					column: parseInt(match[4], 10),
				}
			}
		})
}

/**
 * @param {string} stack
 */
function parseGeckoWebkit(stack) {
	return stack.split("\n").map(line => {
		if (line == "global code@") {
			return {}
		}
		const match = line.match(/@(.+):(\d+):(\d+)/)
		if (match) {
			return {
				source: match[1],
				line: parseInt(match[2], 10),
				column: parseInt(match[3], 10),
			}
		}
	})
}
