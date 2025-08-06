function ensureTrailingSlash(path: string): string {
	if (path.endsWith("/")) return path
	return `${path}/`
}

const nativeEnv = window.__lb.nativeEnv

export default function resolve(path: string, base?: string | URL): string {
	const {imports} = window.__lb.importmap

	if (imports[path]) {
		path = imports[path]
	}

	const lbfsMatch = path.match(/^(littlebook):(.*)/)
	if (lbfsMatch) {
		;[, , path] = lbfsMatch
		const systemMatch = path.match(/^\/?system\/(.*)/)
		const userMatch = path.match(/^\/?user\/(.*)/)
		if (systemMatch) {
			const sys = ensureTrailingSlash(nativeEnv.systemDirectory.toString())
			path = `${sys}${systemMatch[1]}`
		} else if (userMatch) {
			const home = ensureTrailingSlash(nativeEnv.userDirectory.toString())
			path = `${home}${userMatch[1]}`
		}
	}

	return new URL(path, base).toString()
}
