import options, {machineOptions} from "./options.js"
import * as esbuild from "esbuild"
esbuild.build(options)
esbuild.build(machineOptions)
