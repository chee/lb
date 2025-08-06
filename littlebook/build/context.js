import opts from "./options.js"
import * as esbuild from "esbuild"
import {machineOptions} from "./options.js"
/**
 * @param {Partial<import("esbuild").BuildOptions>} extraOpts
 */
export default (extraOpts = {}) => esbuild.context(merge(opts, extraOpts))
export const machineContext = esbuild.context(machineOptions)

/**
 *
 * @param {any} item
 * @returns {item is object}
 */
export function isObject(item) {
	return item && typeof item === "object" && !Array.isArray(item)
}

/**
 *
 * @param {object} target
 * @param  {...object} sources
 * @returns
 */
export function merge(target, ...sources) {
	if (!sources.length) return target
	const source = sources.shift()

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			// todo some kind of types
			// @ts-expect-error
			if (isObject(source[key])) {
				// @ts-expect-error
				if (!target[key]) Object.assign(target, {[key]: {}})
				// @ts-expect-error
				merge(target[key], source[key])
			} else {
				// @ts-expect-error
				Object.assign(target, {[key]: source[key]})
			}
		}
	}

	return merge(target, ...sources)
}
