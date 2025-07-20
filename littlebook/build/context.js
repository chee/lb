import opts from "./options.js"
import * as esbuild from "esbuild"
import {machineOptions} from "./options.js"
/**
 * @param {Partial<import("esbuild").BuildOptions>} extraOpts
 */
export default (extraOpts = {}) => esbuild.context({...opts, ...extraOpts})
export const machineContext = esbuild.context(machineOptions)
