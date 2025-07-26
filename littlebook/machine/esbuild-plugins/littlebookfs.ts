import type {Loader, PluginBuild} from "esbuild-wasm"
import type {LbEnvironment} from "../../bookstrap/bookstrap.ts"

// todo load from any protocol in the lbenv or window.lb.protocols
export default function littlebookfs(
	env: LbEnvironment,
	importmap: {imports: Record<string, string>}
) {
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
					path = args.resolveDir.concat(`/${path}`)
				}

				if (importmap.imports[path]) {
					path = importmap.imports[path]
					// sorry to anyone trying to use the low network bandwidth filesystem
					const lbfsMatch = path.match(/^(littlebook):(.*)/)
					if (lbfsMatch) {
						;[, , path] = lbfsMatch
						const systemMatch = path.match(/^\/?system\/(.*)/)
						const userMatch = path.match(/^\/?user\/(.*)/)
						if (systemMatch) {
							path = `${env.systemDirectory.toString()}/${systemMatch[1]}`
						} else if (userMatch) {
							path = `${env.userDirectory.toString()}/${userMatch[1]}`
						}
					} else {
						const first = path[0]
						if (!["/", "."].includes(first)) {
							return {path, external: true}
						}
					}
				}

				return {namespace, path}
			})
			ctx.onLoad({filter: /.*/, namespace}, async args => {
				let path = args.path

				const content = await env.read(path)

				const extension = (path.match(/\.(\w+)$/)?.[1] ?? "ts") as Loader
				return {
					contents: content,
					loader: extmap[extension] ?? extension,
					resolveDir: new URL(".", env.protocol + "//" + args.path).pathname,
				}
			})
		},
	}
}

// todo merge with window.__lb_esbuildLoaderMap
const extmap = {
	mjs: "js",
	cjs: "js",
	cts: "ts",
	mts: "ts",
}
