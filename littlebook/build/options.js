import fs from "node:fs/promises"
import path from "node:path"
/** @type {import("esbuild").BuildOptions} */
const bookstrapOptions = {
	format: "iife",
	define: {
		"self.LITTLEBUILDDATE": JSON.stringify(new Date().toISOString()),
	},
	entryPoints: [
		"./bookstrap/**",
		// todo remove after https://bugzilla.mozilla.org/show_bug.cgi?id=1969527
		"./machine/service-worker.ts",
	],
	outdir: "./dist",
	loader: {".html": "copy", ".txt": "copy", ".wasm": "copy"},
	platform: "browser",
	logLevel: "debug",
	sourcemap: "both",
	plugins: [
		{
			name: "dehouse",
			setup: build => {
				const originalOutdir = build.initialOptions.outdir

				build.onEnd(async result => {
					if (!originalOutdir || result.errors.length > 0) return
					const files = await fs.readdir(originalOutdir, {
						recursive: true,
					})

					for (const file of files) {
						try {
							const fullPath = path.join(originalOutdir, file)
							const stat = await fs.stat(fullPath)
							if (stat.isFile()) {
								const pathParts = file.split(path.sep)
								if (pathParts.length > 1) {
									pathParts.splice(0, 1)
									const newPath = path.join(originalOutdir, ...pathParts)
									await fs.mkdir(path.dirname(newPath), {
										recursive: true,
									})
									await fs.rename(fullPath, newPath)
								}
							}
						} catch (error) {
							console.error(`Error processing file ${file}:`, error)
						}
					}
				})
			},
		},
	],
}

export default bookstrapOptions

/** @type {import("esbuild").BuildOptions} */
export const machineOptions = {
	entryPoints: ["./machine/transformer.ts"],
	outdir: `${bookstrapOptions.outdir}/machine`,
	bundle: true,
	platform: "browser",
	format: "esm",
	splitting: true,
	logLevel: "debug",
	sourcemap: "both",
}
