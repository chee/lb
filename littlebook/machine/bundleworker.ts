// hehe littlebootstraps
import esbuild, {type BuildOptions} from "esbuild-wasm"
import type {LbEnvironment} from "../bookstrap/bookstrap.ts"
import littlebookfs from "./esbuild-plugins/littlebookfs.ts"

window.__lb_esbuildPlugins ??= []

const importmapElement = document.head.querySelector<HTMLScriptElement>(
	'script[type="importmap"]'
)

const importmap = importmapElement
	? JSON.parse(importmapElement.textContent)
	: {imports: {}}

await initialize(__lb_native_env)
async function initialize(env: LbEnvironment) {
	performance.mark("machine:start")
	await esbuild.initialize({wasmURL: "/esbuild.wasm"})

	async function bundle(path: string, options?: BuildOptions) {
		return await esbuild.build({
			entryPoints: [path],
			bundle: true,
			outdir: "/",
			sourcemap: "both",
			platform: "browser",
			format: "esm",
			...options,
			plugins: [
				{
					name: "importmap",
					setup(ctx) {
						ctx.onResolve({filter: /^[^./]/}, args => {
							if (importmap.imports[args.path]) {
								return {
									path: importmap.imports[args.path],
									external: true,
								}
							}
							return {path: args.path, external: true}
						})
					},
				},
				littlebookfs(__lb_native_env),
				...self.__lb_esbuildPlugins,
				...(options?.plugins ?? []),
			],
		})
	}

	performance.mark("bundle:start")
	const output = await bundle(
		new URL("entrypoint.ts", `${env.systemDirectory}`).pathname
	)
	performance.mark("bundle:end")

	if (output.errors.length) {
		throw new Error(
			`esbuild failed to bundle littlebook: ${output.errors
				.map(e => e.text)
				.join("\n")}`
		)
	}

	window.__lb_bundleResult = output
	window.__lb_bundle = bundle

	const js = output.outputFiles.find(f => f.path.endsWith(".js"))
	const jsBlob = new Blob([js.contents], {
		type: "application/javascript",
	})

	// this way you get sourcemaps
	try {
		await import(URL.createObjectURL(jsBlob))
	} catch (error) {
		console.error("Failed to import bundled script:", error)
		throw error
	}

	const css = output.outputFiles.find(f => f.path.endsWith(".css"))
	if (css) {
		const link = document.createElement("link")
		link.rel = "stylesheet"
		link.href = URL.createObjectURL(
			new Blob([css.contents], {
				type: "text/css",
			})
		)
		document.head.append(link)
	}
	performance.mark("machine:end")
	const bundleMeasure = performance.measure(
		"bundle",
		"bundle:start",
		"bundle:end"
	)
	const machineMeasure = performance.measure(
		"machine",
		"machine:start",
		"machine:end"
	)
	console.log(
		`machine initialized in ${machineMeasure.duration}ms, ${bundleMeasure.duration}ms of which was bundling the entrypoint`
	)
}
