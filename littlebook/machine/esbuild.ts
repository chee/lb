import * as esbuild from "esbuild-wasm"

export async function createEsbuild() {
	const esbuildInitialized = Promise.withResolvers<void>()
	await esbuild
		.initialize({wasmURL: "/esbuild.wasm", worker: false})
		.then(() => esbuildInitialized.resolve())
	return esbuild
}

const extmap = {
	mjs: "js",
	cjs: "js",
	cts: "ts",
	mts: "ts",
} as const

export async function transformWithEsbuild(
	esbuild: Awaited<ReturnType<typeof createEsbuild>>,
	url: URL | string,
	input: string | Uint8Array,
	options?: esbuild.TransformOptions
) {
	url = url.toString()
	const ext = url.split(".").pop() as esbuild.Loader
	const mapped = extmap[ext as keyof typeof extmap]

	return await esbuild.transform(input, {
		loader: mapped ?? ext,
		sourcemap: "inline",
		platform: "browser",
		format: "esm",
		sourcefile: url.toString(),
		target: "esnext",
		logLevel: "debug",
		logOverride: {
			"unsupported-dynamic-import": "silent",
		},
		...options,
	})
}
