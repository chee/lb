// hehe little bootstraps
// todo could move all this to / and this could be a non-module script too

/**
 * @import {BuildOptions, initialize} from "esbuild-wasm"
 * @import * as ESBUILD from "esbuild-wasm"
 */

/**
 * @param {Uint8Array} bytes
 */
async function andImport(bytes, type = "application/javascript") {
	return import(URL.createObjectURL(new Blob([bytes], {type})))
}

/**
 *
 * @param {LittlebookHost} host
 */
async function initialize(host) {
	const system = host.systemDirectory

	/** @param {string} path */
	const dotslash = path => system.toString() + "boot/stage1/" + path
	const esbuild = /** @type {ESBUILD} */ (
		await host.read(dotslash("esbuild.js")).then(andImport)
	)
	const eswasm = await host.read(dotslash("esbuild.wasm"))

	const {eternal} = await host
		.read(dotslash("esbuild-plugins/dynamic-external.js"))
		.then(andImport)
	const {default: hostfs} = await host
		.read(dotslash("esbuild-plugins/hostfs.js"))
		.then(andImport)

	await esbuild.initialize({
		// this is a prereq of stage0 so it'll be there
		wasmModule: new WebAssembly.Module(eswasm),
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
			sourcemap: "both",
			platform: "browser",
			format: "esm",
			/**
			 * @type {BuildOptions["plugins"]}
			 */
			plugins: [
				{
					// todo replace with local imports
					name: "autoesmsh",
					setup(ctx) {
						ctx.onResolve({filter: /^[^./]/}, args => {
							try {
								new URL(args.path)
								return {path: args.path, external: true}
							} catch {
								return {path: `https://esm.sh/${args.path}`, external: true}
							}
						})
					},
				},
				hostfs(host),
			],
		})
	}

	const output = await bundle(
		new URL("core/littlebook.ts", `${host.protocol}//${host.systemDirectory}`)
			.pathname
	)
	if (output.errors.length) {
		throw new Error(
			`esbuild failed to bundle littlebook: ${output.errors
				.map(e => e.text)
				.join("\n")}`
		)
	}

	window.__littlebook = {
		host,
		esbuild,
		bundle,
		output,
	}

	const script = document.createElement("script")
	script.type = "module"
	const jsblob = new Blob(
		[output.outputFiles.find(f => f.path.endsWith(".js")).contents],
		{
			type: "text/javascript",
		}
	)

	const jsurl = URL.createObjectURL(jsblob)
	script.src = jsurl
	document.head.append(script)
	const link = document.createElement("link")
	link.rel = "stylesheet"
	link.href = URL.createObjectURL(
		new Blob([output.outputFiles.find(f => f.path.endsWith(".css")).contents], {
			type: "text/css",
		})
	)
	document.head.append(link)
}

window.__littlebootstrap = initialize
window.dispatchEvent(new Event("__littlebootstrap"))
