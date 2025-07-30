const colors = [
	"#33c7ac",
	"#3399ff",
	"#FF4136",
	"#2ECC40",
	"#0074D9",
	"#FF851B",
	"#7FDBFF",
	"#B10DC9",
	"#ff2a50",
	"#3ecece",
	"#FFDC00",
	"#675942",
	"#001f3f",
	"#39CCCC",
	"#01FF70",
	"#85144b",
	"#F012BE",
	"#3D9970",
	"#ABCDEF",
]

let colorIndex = 0
const namespaceColors: Record<string, string> = {}
const loggers: Record<string, any> = {}

/**
 * get the namespace's colour
 */
function colour(namespace: string): string {
	if (namespace in namespaceColors) {
		return namespaceColors[namespace]
	}

	const color = colors[colorIndex++ % colors.length]
	namespaceColors[namespace] = color
	return color
}

const setting = localStorage.getItem("debug") || localStorage.getItem("DEBUG")

function enabled(namespace: string): boolean {
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
 */
function formatArgs(args: any[]): any[] {
	const first = args[0]
	if (typeof first === "string" && first.includes("%")) {
		return args
	}
	return args
}

export type Debugger = typeof console.log & {
	extend: (suffix: string) => Debugger
}

function createLogger(namespace: string): Debugger {
	if (namespace in loggers) {
		return loggers[namespace]
	}
	const color = colour(namespace)
	/**
	 * @this {typeof console.log}
	 * @param {...any} args
	 */
	function debug(...args: any[]) {
		if (!enabled(namespace)) return
		const formattedArgs = formatArgs(args)
		const timestamp = new Date().toISOString()
		console.log.call(
			console,
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
	debug.extend = (suffix: string) => createLogger(`${namespace}:${suffix}`)
	loggers[namespace] = debug
	return debug
}

export default createLogger
