import {LbSet} from "./set.ts"

export function createRegistry<P, T>(label: string) {
	const items: Record<string, T> = {}
	const matchers = new LbSet<readonly [(matcher: P) => boolean, string]>()
	return {
		items,
		matchers,
		register(id: string, item: T) {
			if (items[id]) {
				console.warn(`overwriting ${label} "${id}". just letting u know`)
			}
			items[id] = item
		},
		get(id: string): T | undefined {
			return items[id]
		},
		delete(id: string): boolean {
			return delete items[id]
		},
		match(target: P, fallback?: string): string | undefined {
			for (const [match, item] of matchers) {
				if (match(target)) {
					return item
				}
			}
			return fallback
		},
		matchAll(target: P): string[] {
			const results: string[] = []
			for (const [match, item] of matchers) {
				if (match(target)) {
					results.push(item)
				}
			}
			return results
		},
		find(target: P, fallback?: string): T | undefined {
			const id = this.match(target, fallback)
			if (id) {
				return this.get(id)
			}
			return undefined
		},
		findAll(target: P): T[] {
			const results: T[] = []
			for (const [match, name] of matchers) {
				if (match(target)) {
					const item = this.get(name)
					if (item) {
						results.push(item)
					} else {
						console.warn(
							`${label} registry: item with id "${name}" not found for matcher.`
						)
					}
				}
			}
			return results
		},
		registerMatcher(matcher: (matcher: P) => boolean, id: string) {
			const pair = [matcher, id] as const
			matchers.add(pair)
			return () => {
				matchers.delete(pair)
			}
		},
	}
}
