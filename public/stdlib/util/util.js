import "./list.js"
import "./modshift.js"

defcmd(
	"match-url-pattern",
	/**
	 * @param {Array<[RegExp, string]>} patterns
	 * @param {string | URL} url
	 * @param {string} [fallback]
	 * @param {string} [query]
	 */
	function (patterns, url, fallback, query) {
		;`Match a ${url} against a set of ${patterns}, returning the name of the first match or a ${fallback}.
		The ${query} option will use ${url}'s search params as an override.`
		if (typeof url != "string") {
			//	if (url.searchParams?.has(query)) {
			//	return url.searchParams?.get(query) ?? fallback
			//}
			url = url.toString()
		}
		for (const [pattern, name] of patterns) {
			if (pattern.test(url)) {
				return name
			}
		}
		return fallback
	}
)
