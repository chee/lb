/**
 * @typedef {Object} SetOptions
 * @property {boolean} [force] - Force overwrite non-object keys into objects if needed
 * @property {boolean} [readonly] - make the value not writable or configurable
 */

/**
 * @typedef {Object} TransformOptions
 * @property {string} [delimiter='.'] - Delimiter to use for splitting keys
 */

// Weird IE shit, objects do not have hasOwn, but the prototype does...
const hasOwnProp = Object.prototype.hasOwnProperty

/**
 * Reverses and duplicates an array
 * @param {any[]} array - Array to reverse and duplicate
 * @returns {any[]} Reversed duplicate array
 */
const reverseDupArray = array => {
	const result = new Array(array.length)
	let index = array.length
	const arrayMaxIndex = index - 1

	while (index--) {
		result[arrayMaxIndex - index] = array[index]
	}

	return result
}

// Dottie memoization flag
let memoizePath = true
const memoized = {}

/**
 * Traverse object according to path, return value if found - Return undefined if destination is unreachable
 * @param {Object} object - Object to traverse
 * @param {string|string[]} path - Path to traverse (dot-separated string or array)
 * @param {*} [defaultVal] - Default value to return if path not found
 * @returns {*} Value at path or defaultVal
 */
export const get = (object, path, defaultVal) => {
	if (
		object === undefined ||
		object === null ||
		path === undefined ||
		path === null
	) {
		return defaultVal
	}

	let names

	if (typeof path === "string") {
		if (memoizePath) {
			if (memoized[path]) {
				names = memoized[path].slice(0)
			} else {
				names = path.split(".").reverse()
				memoized[path] = names.slice(0)
			}
		} else {
			names = path.split(".").reverse()
		}
	} else if (Array.isArray(path)) {
		names = reverseDupArray(path)
	}

	while (
		names.length &&
		(object = object[names.pop()]) !== undefined &&
		object !== null
	);

	// Handle cases where accessing a childprop of a null value
	if (object === null && names.length) object = undefined

	return object === undefined ? defaultVal : object
}

/**
 * Check if a path exists in an object
 * @param {Object} object - Object to check
 * @param {string|string[]} path - Path to check
 * @returns {boolean} True if path exists
 */
export const exists = (object, path) => {
	return get(object, path) !== undefined
}

/**
 * Set nested value
 * @param {Object} object - Object to set value in
 * @param {string|string[]} path - Path to set (dot-separated string or array)
 * @param {*} value - Value to set
 * @param {SetOptions} [options] - Options for setting
 */
export const set = (object, path, value, options) => {
	const pieces = Array.isArray(path) ? path : path.split(".")
	let current = object
	let piece
	const length = pieces.length

	if (pieces[0] === "__proto__") return

	if (typeof current !== "object") {
		throw new Error("Parent is not an object.")
	}

	for (let index = 0; index < length; index++) {
		piece = pieces[index]

		// Create namespace (object) where none exists.
		// If `force === true`, bruteforce the path without throwing errors.
		if (
			!hasOwnProp.call(current, piece) ||
			current[piece] === undefined ||
			((typeof current[piece] !== "object" || current[piece] === null) &&
				options &&
				options.force === true)
		) {
			current[piece] = {}
		}

		if (index == length - 1) {
			// Set final value
			current[piece] = value
		} else {
			// We do not overwrite existing path pieces by default
			if (typeof current[piece] !== "object" || current[piece] === null) {
				throw new Error(
					'Target key "' +
						piece +
						'" is not suitable for a nested value. (It is in use as non-object. Set `force` to `true` to override.)'
				)
			}

			// Traverse next in path
			current = current[piece]
		}
	}

	current[piece] = value
}

/**
 * Set default nested value (only if path doesn't exist)
 * @param {Object} object - Object to set default value in
 * @param {string|string[]} path - Path to set
 * @param {*} value - Default value to set
 */
export const setDefault = (object, path, value) => {
	if (get(object, path) === undefined) {
		set(object, path, value)
	}
}

/**
 * Transform unnested object with delimiter-separated keys into a nested object
 * @param {Object|Object[]} object - Object or array of objects to transform
 * @param {TransformOptions} [options] - Transform options
 * @returns {Object|Object[]} Transformed object or array
 */
export const transform = (object, options) => {
	if (Array.isArray(object)) {
		return object.map(o => transform(o, options))
	}

	options = options || {}
	options.delimiter = options.delimiter || "."

	let pieces
	let piecesLength
	let piece
	let current
	const transformed = {}
	let key
	const keys = Object.keys(object)
	const length = keys.length

	for (let i = 0; i < length; i++) {
		key = keys[i]

		if (key.indexOf(options.delimiter) !== -1) {
			pieces = key.split(options.delimiter)

			if (pieces[0] === "__proto__") break

			piecesLength = pieces.length
			current = transformed

			for (let index = 0; index < piecesLength; index++) {
				piece = pieces[index]
				if (index != piecesLength - 1 && !current.hasOwnProperty(piece)) {
					current[piece] = {}
				}

				if (index == piecesLength - 1) {
					current[piece] = object[key]
				}

				current = current[piece]
				if (current === null) {
					break
				}
			}
		} else {
			transformed[key] = object[key]
		}
	}

	return transformed
}

/**
 * Flatten nested object into dot-separated keys
 * @param {Object} object - Object to flatten
 * @param {string} [separator='.'] - Separator to use between keys
 * @returns {Object} Flattened object
 */
export const flatten = (object, separator) => {
	if (typeof separator === "undefined") separator = "."
	const flattened = {}
	let current
	let nested

	for (const key in object) {
		if (hasOwnProp.call(object, key)) {
			current = object[key]
			if (Object.prototype.toString.call(current) === "[object Object]") {
				nested = flatten(current, separator)

				for (const _key in nested) {
					flattened[key + separator + _key] = nested[_key]
				}
			} else {
				flattened[key] = current
			}
		}
	}

	return flattened
}

/**
 * Get all paths in an object
 * @param {Object} object - Object to get paths from
 * @param {string[]} [prefixes=[]] - Prefix array for recursion
 * @returns {string[]} Array of dot-separated paths
 */
export const paths = (object, prefixes) => {
	let pathsArray = []
	let value
	let key

	prefixes = prefixes || []

	if (typeof object === "object") {
		for (key in object) {
			value = object[key]

			if (typeof value === "object" && value !== null) {
				pathsArray = pathsArray.concat(paths(value, prefixes.concat([key])))
			} else {
				pathsArray.push(prefixes.concat(key).join("."))
			}
		}
	} else {
		throw new Error("Paths was called with non-object argument.")
	}

	return pathsArray
}

// Export memoization control
export {memoizePath}

/**
 * Set memoization flag
 * @param {boolean} value - Whether to enable memoization
 */
export const setMemoizePath = value => {
	memoizePath = value
}

// Default export for compatibility
export default {
	get,
	exists,
	set,
	setDefault,
	transform,
	flatten,
	paths,
	memoizePath,
	setMemoizePath,
}
