import {List} from "./list.ts"
import WarningMap from "./warning-map.ts"

export default class Registry<P, T> {
	registry: WarningMap<string, T>
	matchers = new List<readonly [(matcher: P) => boolean, string]>()
	constructor(label: string) {
		this.registry = new WarningMap<string, T>(label)
	}
	register(id: string, item: T) {
		this.registry.set(id, item)
	}
	get(id: string): T | undefined {
		return this.registry.get(id)
	}
	delete(id: string): boolean {
		return this.registry.delete(id)
	}
	match(target: P): string | undefined {
		for (const [match, item] of this.matchers.items) {
			if (match(target)) {
				return item
			}
		}
		return undefined
	}
	matchAll(target: P): string[] {
		const results: string[] = []
		for (const [match, item] of this.matchers.items) {
			if (match(target)) {
				results.push(item)
			}
		}
		return results
	}
	find(target: P): T | undefined {
		const id = this.match(target)
		if (id) {
			return this.get(id)
		}
		return undefined
	}
	findAll(target: P): T[] {
		const results: T[] = []
		for (const [match, name] of this.matchers.items) {
			if (match(target)) {
				const item = this.get(name)
				if (item) {
					results.push(item)
				} else {
					console.warn(
						`${this.registry.label} registry: item with id "${name}" not found for matcher.`
					)
				}
			}
		}
		return results
	}
	registerMatcher(matcher: (matcher: P) => boolean, id: string) {
		const pair = [matcher, id] as const
		this.matchers.add(pair)
		return () => {
			this.matchers.delete(pair)
		}
	}
}
