import {JSONSchema} from "json-schema-typed"

export interface LittlebookSetting<V = unknown> {
	id: string
	value: V
	doc: string
	title?: string
	source?: string
	line?: number
	column?: number
	schema?: JSONSchema
}

// todo inject things into this in the VFS
export interface LittlebookSettings {}

class Settings {
	_registry: Record<string, LittlebookSetting> = {}
	public define<V = unknown>(setting: LittlebookSetting<V>) {
		this._registry[setting.id] = setting
	}
	public retrieve(name: string): LittlebookSetting | undefined {
		return this._registry[name]
	}

	public get<N extends string>(name: N) {
		return this._registry[name]?.value as N extends keyof LittlebookSettings
			? LittlebookSettings[N]
			: unknown
	}

	public set<
		N extends string,
		V extends N extends keyof LittlebookSettings
			? LittlebookSettings[N]
			: unknown
	>(name: N, value: V) {
		if (this._registry[name]) this._registry[name].value = value
	}

	public describe<T extends string>(name: T) {
		const cmd = this.retrieve(name)
		const loc = cmd.source
			? `defined at <${cmd.source}:${cmd.line}:${cmd.column}>`
			: "without a source location"

		return `\`${name}\` is a setting ${loc}.\n\n${cmd.doc ?? ""}`
	}
}

export interface LittlebookSettings {
	lol: number
	hehe: string
}

export default new Settings()
