import type {LbEnvironment} from "bookstrap"

export function ensureTrailingSlash(path: string): string {
	if (path.endsWith("/")) return path
	return `${path}/`
}

// yes it makes sense for nativefs.resolve() to take care of littlebook: maybe
// todo share with transformer (maybe by adding it to nativefs?)
export function resolvePath(
	path: string,
	nativefs: LbEnvironment,
	base?: string | URL
): URL {
	const {imports} = window.__lb_importmap

	if (imports[path]) {
		path = imports[path]
	}

	const lbfsMatch = path.match(/^(littlebook):(.*)/)
	if (lbfsMatch) {
		;[, , path] = lbfsMatch
		const systemMatch = path.match(/^\/?system\/(.*)/)
		const userMatch = path.match(/^\/?user\/(.*)/)
		if (systemMatch) {
			const sys = ensureTrailingSlash(nativefs.systemDirectory.toString())
			path = `${sys}${systemMatch[1]}`
		} else if (userMatch) {
			const home = ensureTrailingSlash(nativefs.userDirectory.toString())
			path = `${home}${userMatch[1]}`
		}
	}

	return new URL(path, base)
}
