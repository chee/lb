import options, {machineOptions} from "./options.js"
import * as esbuild from "esbuild"
import {VFSPackager} from "./vfs.js"
esbuild.build(options)
esbuild.build(machineOptions)
const vfs = new VFSPackager()
const system = new URL(import.meta.resolve("../system")).pathname
vfs.packDirectory(system, `${options.outdir}/system.json`)
