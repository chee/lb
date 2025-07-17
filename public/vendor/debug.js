const colors = [
	"#33f7dc",
	"3399ff",
	"#0074D9",
	"#FF4136",
	"#2ECC40",
	"#FF851B",
	"#7FDBFF",
	"#B10DC9",
	"#ff2a50",
	"#3ecece",
	"#FFDC00",
	"#001f3f",
	"#39CCCC",
	"#01FF70",
	"#85144b",
	"#F012BE",
	"#3D9970",
	"#111111",
	"#AAAAAA",
]

let colorIndex = 0
/** @type {Record<string, string>} */
const namespaceColors = {}
/** @type {Record<string, any>} */
const loggers = {}

/**
 * get the namespace's colour
 * @param {string} namespace
 * @returns {string}
 */
function colour(namespace) {
	if (namespace in namespaceColors) {
		return namespaceColors[namespace]
	}

	const color = colors[colorIndex++ % colors.length]
	namespaceColors[namespace] = color
	return color
}

const setting = localStorage.getItem("debug") || localStorage.getItem("DEBUG")

/**
 * @param {string} namespace
 * @returns {boolean}
 */
function enabled(namespace) {
	if (!setting) return false

	const patterns = setting.split(",").map(s => s.trim())

	return patterns.some(pattern => {
		if (pattern === "*") return true
		if (pattern.endsWith("*")) {
			return namespace.startsWith(pattern.slice(0, -1))
		}
		return namespace === pattern
	})
}

/**
 * Format the arguments for logging.
 * @param {any[]} args
 * @returns {any[]}
 */
function formatArgs(args) {
	const first = args[0]
	if (typeof first === "string" && first.includes("%")) {
		return args
	}
	return args
}

/**
 * @typedef {typeof console.log & {extend: (suffix: string) => Debugger}} Debugger
 */

/**
 *
 * @param {string} namespace
 * @returns {Debugger}
 */
function createDebug(namespace) {
	if (namespace in loggers) {
		return loggers[namespace]
	}
	const color = colour(namespace)
	/**
	 * @this {typeof console.log}
	 * @param {...any} args
	 */
	function debug(...args) {
		if (!enabled(namespace)) return
		const formattedArgs = formatArgs(args)
		const timestamp = new Date().toISOString()
		console.log(
			`%c${namespace}%c ${timestamp}`,
			`color: ${color}; font-weight: bold`,
			"color: inherit",
			...formattedArgs
		)
	}
	debug.enabled = () => enabled(namespace)
	debug.namespace = namespace
	debug.color = color
	/** @param {string} suffix */
	debug.extend = suffix => createDebug(`${namespace}:${suffix}`)
	loggers[namespace] = debug
	return debug
}

export default createDebug
