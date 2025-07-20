/**
 * @import {PluginBuild, Loader} from "esbuild-wasm"
 */

/**
 *
 * @param {LittlebookHost} host
 * @returns
 */
export default function hostfs(host) {
	return {
		name: "hostfs",
		/**
		 * @param {PluginBuild} ctx
		 */
		setup(ctx) {
			const namespace = "taurifs"
			ctx.onResolve({filter: /.*/}, async args => {
				let path = args.path
				if (path.startsWith(host.protocol)) {
					path = path.slice(host.protocol.length).replace(/^\/+/, "/")
				}
				const isRelative = path.match(/^\./)
				if (isRelative) {
					path = new URL(path, host.protocol + "//" + args.resolveDir + "/")
						.pathname
				}

				return {namespace, path}
			})
			ctx.onLoad({filter: /.*/, namespace}, async args => {
				let path = args.path
				const content = await host.read(path)
				const extension = path.match(/\.(\w+)$/)?.[1] ?? "ts"
				return {
					contents: content,
					loader: /** @type {Loader} */ (extension ?? "ts"),
					resolveDir: new URL(".", host.protocol + "//" + args.path).pathname,
				}
			})
		},
	}
}
