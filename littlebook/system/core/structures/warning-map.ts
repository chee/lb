export default class WarningMap<K, T> extends Map<K, T> {
	label: string

	constructor(label: string) {
		super()
		this.label = label
	}

	set(key: K, value: T) {
		if (this.has(key)) {
			console.warn(`overwriting ${this.label}: "${key}"`)
		}
		return super.set(key, value)
	}
}
