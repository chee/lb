import type {Loader, PluginBuild} from "esbuild-wasm"
import type {LbEnvironment} from "../../bookstrap/bookstrap.ts"

// todo load from any protocol in the lbenv or window.lb.protocols
export default function littlebookfs(env: LbEnvironment) {
	return {
		name: "littlebookfs",
		setup(ctx: PluginBuild) {
			const namespace = env.protocol.slice(0, -1)
			ctx.onResolve({filter: /.*/}, async args => {
				let path = args.path
				if (path.startsWith(env.protocol)) {
					path = path.slice(env.protocol.length).replace(/^\/+/, "/")
				}
				const isRelative = path.match(/^\./)
				if (isRelative) {
					path = new URL(path, env.protocol + "//" + args.resolveDir + "/")
						.pathname
				}

				return {namespace, path}
			})
			ctx.onLoad({filter: /.*/, namespace}, async args => {
				let path = args.path

				const content = await env.read(path)
				// todo check window.__lb_esbuildLoaderMap
				const extension = (path.match(/\.(\w+)$/)?.[1] ?? "ts") as Loader
				return {
					contents: content,
					loader: extension,
					resolveDir: new URL(".", env.protocol + "//" + args.path).pathname,
				}
			})
		},
	}
}
