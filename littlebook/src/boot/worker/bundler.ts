import * as esbuild from "./esbuild.ts"
// this is a prereq of stage0 so it'll be there
await esbuild.initialize({
	wasmURL: "/esbuild.wasm",
	// we're already in a worker
	worker: false,
})
import esbuildVirtual from "../../core/worker/esbuild/plugin-virtual.ts"
import {eternal} from "../../core/worker/esbuild/plugin-dynamic-external.ts"
import {fileTreeToVirtualFileSystem} from "../../core/worker/esbuild/virtual.ts"

let doing = false
let done = false
async function initializeEsbuild() {
	if (doing || done) return
	doing = true
	await esbuild.initialize({wasmURL: esbuildWasm})
	done = true
}

export async function bundle(
	doc: Project,
	prefix: string
): Promise<esbuild.BuildResult> {
	await initializeEsbuild()
	if (!done) {
		throw new Error("trying to bundle before init")
	}
	const virtualFileSystem = fileTreeToVirtualFileSystem(doc.src, prefix)

	const entry = findEntryFileName(doc)
	const jsxImportSource =
		doc.meta.jsxImportSource == "string" ? doc.meta.jsxImportSource : undefined

	const build = await esbuild.build({
		entryPoints: [`${prefix}/${entry}`],
		bundle: true,
		minify: false,
		sourcemap: "inline",
		format: "esm",
		treeShaking: true,
		// loader: { ".css": "text" },
		plugins: [
			solid({files: virtualFileSystem, jsxImportSource}),
			eternal,
			esbuildVirtual(virtualFileSystem),
		],
		outdir: ".",
	})

	return build
}

export async function transform(
	doc: Project,
	prefix: string
): Promise<esbuild.BuildResult> {
	await initializeEsbuild()
	if (!done) {
		throw new Error("trying to bundle before init")
	}
	const virtualFileSystem = fileTreeToVirtualFileSystem(doc.src, prefix)

	const entry = findEntryFileName(doc)
	const jsxImportSource =
		doc.meta.jsxImportSource == "string" ? doc.meta.jsxImportSource : undefined

	const build = await esbuild.build({
		entryPoints: [`${prefix}/${entry}`],
		bundle: true,
		minify: false,
		sourcemap: "inline",
		format: "esm",
		treeShaking: true,
		// loader: { ".css": "text" },
		plugins: [
			solid({files: virtualFileSystem, jsxImportSource}),
			eternal,
			esbuildVirtual(virtualFileSystem),
		],
		outdir: ".",
	})

	return build
}
