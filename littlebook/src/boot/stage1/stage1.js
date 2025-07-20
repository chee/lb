// hehe little bootstraps
// todo could move all this to / and this could be a non-module script too

/**
 * @import {BuildOptions} from "esbuild-wasm"
 */

/**
 *
 * @param {LittlebookHost} host
 */
async function initialize(host) {
	const {eternal} = await import("/esbuild-plugins/dynamic-external.js")
	const hostfs = await import("../stage0/shared/esbuild-plugins/hostfs.js")
	await esbuild.initialize({
		// this is a prereq of stage0 so it'll be there
		wasmURL: "/esbuild.wasm",
		worker: true,
	})

	/**
	 *
	 * @param {string} path
	 * @param {BuildOptions} [options]
	 * @returns
	 */
	async function bundle(path, options) {
		return await esbuild.build({
			...options,
			entryPoints: [path],
			bundle: true,
			outdir: "/",
			sourcemap: true,
			platform: "browser",
			format: "esm",
			plugins: [eternal, hostfs(host)],
		})
	}

	window.__littlebook = {
		host,
		esbuild,
		bundle,
	}

	await bundle(
		new URL("core/littlebook.ts", `${host.protocol}//${host.systemDirectory}`)
			.pathname
	)
}

window.__littlebootstrap = initialize
