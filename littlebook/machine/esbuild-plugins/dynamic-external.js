/**
 * @import {PluginBuild} from "esbuild-wasm"
 */

// todo replace this with something that loads from
// `/systemDirectory/modules/${name}.ts` unless the path has a protocol

/**
 *
 * @param {RegExp} filter
 * @returns
 */
export default function dynamicExternal(filter) {
	return {
		name: "dynamic-external",
		/**
		 *
		 * @param {PluginBuild} ctx
		 */
		setup(ctx) {
			ctx.onResolve({filter}, args => {
				return {path: args.path, external: true}
			})
		},
	}
}

// make everything external except for relative paths
export const eternal = dynamicExternal(/^[^./]/)
