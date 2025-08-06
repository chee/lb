export type PathPart = number | string
export type PatchRange = [number?, number?] | PathPart

export type JSONOp = {
	type: "json"
	path: PathPart[]
	range: PatchRange
	value?: any
}

interface ProxyState {
	patches: JSONOp[]
	copies: Map<any, any>
	revoked: boolean
}

const PROXY_STATE = Symbol("proxy-state")

export function produceWithPatches<T>(
	base: T,
	recipe: (draft: T) => void | T
): [T, JSONOp[]] {
	const state: ProxyState = {
		patches: [],
		copies: new Map(),
		revoked: false,
	}

	const draft = createProxy(base, state, []) as T
	const result = recipe(draft) || draft

	// Revoke all proxies to prevent further mutations
	state.revoked = true

	return [result, state.patches]
}

function createProxy(target: any, state: ProxyState, path: PathPart[]): any {
	if (target === null || typeof target !== "object") {
		return target
	}

	// Don't proxy already proxied objects
	if (target[PROXY_STATE]) {
		return target
	}

	// Check if we already have a copy for this target
	if (state.copies.has(target)) {
		return state.copies.get(target)
	}

	const isArray = Array.isArray(target)
	let copy = target // Start with original, copy on first write
	let hasBeenCopied = false

	function ensureCopied() {
		if (!hasBeenCopied) {
			copy = isArray ? [...(target as any[])] : {...target}
			hasBeenCopied = true
			state.copies.set(target, proxy)
		}
		return copy
	}

	const proxy = new Proxy(target, {
		get(_, prop, receiver) {
			if (prop === PROXY_STATE) {
				return state
			}

			if (state.revoked) {
				throw new Error("Cannot use revoked proxy")
			}

			const currentTarget = hasBeenCopied ? copy : target
			const value = Reflect.get(currentTarget, prop, receiver)

			// Handle array methods that mutate
			if (isArray && typeof prop === "string" && typeof value === "function") {
				return createArrayMethod(currentTarget, prop, state, path, ensureCopied)
			}

			// Proxy nested objects/arrays
			if (value !== null && typeof value === "object") {
				return createProxy(value, state, [...path, prop as PathPart])
			}

			return value
		},

		set(_, prop, value, receiver) {
			if (state.revoked) {
				throw new Error("Cannot use revoked proxy")
			}

			const currentTarget = hasBeenCopied ? copy : target
			const oldValue = currentTarget[prop as keyof typeof currentTarget]
			const hadKey = prop in currentTarget

			// Don't generate patch if value hasn't actually changed
			if (hadKey && oldValue === value) {
				return true
			}

			// Ensure we have a copy before mutating
			const mutableTarget = ensureCopied()

			// Set the value
			const result = Reflect.set(mutableTarget, prop, value, receiver)

			// Generate patch for new or changed value
			state.patches.push({
				type: "json",
				path,
				range: prop as PathPart,
				value,
			})

			return result
		},

		deleteProperty(_, prop) {
			if (state.revoked) {
				throw new Error("Cannot use revoked proxy")
			}

			const currentTarget = hasBeenCopied ? copy : target
			const hadKey = prop in currentTarget

			if (!hadKey) {
				return true
			}

			// Ensure we have a copy before mutating
			const mutableTarget = ensureCopied()

			const result = Reflect.deleteProperty(mutableTarget, prop)

			if (isArray && typeof prop === "string" && /^\d+$/.test(prop)) {
				// Array element deletion - use range format
				const index = parseInt(prop)
				state.patches.push({
					type: "json",
					path,
					range: [index, index + 1],
				})
			} else {
				// Object property deletion
				state.patches.push({
					type: "json",
					path,
					range: prop as PathPart,
				})
			}

			return result
		},

		// Return the copy if it exists, otherwise the original
		ownKeys(_) {
			const currentTarget = hasBeenCopied ? copy : target
			return Reflect.ownKeys(currentTarget)
		},

		has(_, prop) {
			const currentTarget = hasBeenCopied ? copy : target
			return Reflect.has(currentTarget, prop)
		},

		getOwnPropertyDescriptor(_, prop) {
			const currentTarget = hasBeenCopied ? copy : target
			return Reflect.getOwnPropertyDescriptor(currentTarget, prop)
		},
	})

	return proxy
}

function createArrayMethod(
	target: any[],
	method: string,
	state: ProxyState,
	path: PathPart[],
	ensureCopied: () => any
) {
	const original = Array.prototype[method as keyof Array<any>] as Function

	return function (this: any[], ...args: any[]) {
		if (state.revoked) {
			throw new Error("Cannot use revoked proxy")
		}

		// Ensure we have a mutable copy before calling the method
		const mutableTarget = ensureCopied()
		const oldLength = mutableTarget.length

		switch (method) {
			case "push": {
				const result = original.apply(mutableTarget, args)
				// Insert at end
				state.patches.push({
					type: "json",
					path,
					range: [oldLength, oldLength],
					value: args,
				})
				return result
			}

			case "pop": {
				if (oldLength === 0) return original.apply(mutableTarget, args)
				const result = original.apply(mutableTarget, args)
				// Remove last element
				state.patches.push({
					type: "json",
					path,
					range: [oldLength - 1, oldLength],
				})
				return result
			}

			case "shift": {
				if (oldLength === 0) return original.apply(mutableTarget, args)
				const result = original.apply(mutableTarget, args)
				// Remove first element
				state.patches.push({
					type: "json",
					path,
					range: [0, 1],
				})
				return result
			}

			case "unshift": {
				const result = original.apply(mutableTarget, args)
				// Insert at beginning
				state.patches.push({
					type: "json",
					path,
					range: [0, 0],
					value: args,
				})
				return result
			}

			case "splice": {
				const [start, deleteCount = 0, ...items] = args
				const actualStart =
					start < 0
						? Math.max(0, oldLength + start)
						: Math.min(start, oldLength)
				const actualDeleteCount = Math.min(deleteCount, oldLength - actualStart)

				const result = original.apply(mutableTarget, args)

				if (actualDeleteCount > 0 || items.length > 0) {
					if (items.length === 0) {
						// Pure deletion
						state.patches.push({
							type: "json",
							path,
							range: [actualStart, actualStart + actualDeleteCount],
						})
					} else if (actualDeleteCount === 0) {
						// Pure insertion
						state.patches.push({
							type: "json",
							path,
							range: [actualStart, actualStart],
							value: items,
						})
					} else {
						// Replacement
						state.patches.push({
							type: "json",
							path,
							range: [actualStart, actualStart + actualDeleteCount],
							value: items,
						})
					}
				}

				return result
			}

			case "reverse":
			case "sort": {
				// These methods reorder elements - we need to track the full change
				const oldArray = [...mutableTarget]
				const result = original.apply(mutableTarget, args)

				// Generate a replacement patch for the entire array
				if (!arraysEqual(oldArray, mutableTarget)) {
					state.patches.push({
						type: "json",
						path,
						range: [0, oldLength],
						value: [...mutableTarget],
					})
				}

				return result
			}

			default:
				return original.apply(mutableTarget, args)
		}
	}
}

function arraysEqual(a: any[], b: any[]): boolean {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

// Example usage:
export function example() {
	const base = {
		users: [
			{name: "Alice", age: 30},
			{name: "Bob", age: 25},
		],
		settings: {
			theme: "dark",
			notifications: true,
		},
	}

	const [result, patches] = produceWithPatches(base, draft => {
		// Mutation-like operations
		draft.users.push({name: "Charlie", age: 35})
		draft.users[0].age = 31
		draft.settings.theme = "light"
		delete draft.settings.notifications
		draft.users.splice(1, 1) // Remove Bob
	})

	return {result, patches}
}
