import context, {machineContext} from "./context.js"
import options from "./options.js"
import chokidar from "chokidar"
import {VFSPackager} from "./vfs.js"

const ctx = await context({
	banner: {
		js: /*js*/ `;if ("window" in self && !window.esbuildListening) {
			new EventSource('/esbuild').addEventListener('change', () => location.reload())
			window.esbuildListening = true
		};`,
	},
	bundle: true,
})

const vfs = new VFSPackager()
const system = new URL(import.meta.resolve("../system")).pathname
const pack = () => vfs.packDirectory(system, `${options.outdir}/system.json`)
pack()
chokidar.watch(system, {ignoreInitial: true}).on("all", () => {
	console.log("system changed, repacking")
	pack()
	ctx.rebuild()
})

ctx.serve({port: 2025, servedir: options.outdir})
ctx.watch()

const mach = await machineContext
mach.watch()

chokidar
	.watch("../machine", {ignoreInitial: true, cwd: import.meta.dirname})
	.on("all", () => {
		console.log("machine changed, rebuilding main")
		ctx.rebuild()
	})
