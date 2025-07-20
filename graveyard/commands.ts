import {JSONSchema} from "json-schema-typed"

export interface LittlebookCommand<
	A extends unknown[] = unknown[],
	R = unknown
> {
	id: string
	fn(...args: A): R
	doc: string
	interactive?: boolean
	title?: string
	source?: string
	line?: number
	column?: number
	schema?: JSONSchema
}

// todo inject things into this in the VFS
export interface LittlebookCommands {}

class Commands {
	_registry = {}
	public define<Fn extends (...args: unknown[]) => ReturnType<Fn>>(
		cmd: LittlebookCommand<Parameters<Fn>, ReturnType<Fn>>
	) {
		this._registry[cmd.id] = cmd
	}
	public retrieve(name: string): LittlebookCommand | undefined {
		return this._registry[name]
	}

	public call<T extends string>(
		name: T,
		...args: T extends keyof LittlebookCommands
			? Parameters<LittlebookCommands[T]>
			: unknown[]
	): T extends keyof LittlebookCommands
		? ReturnType<LittlebookCommands[T]>
		: unknown {
		const cmd = this.retrieve(name)
		if (!cmd) {
			throw new Error(`Command "${name}" is not defined.`)
		}

		return cmd.fn.apply(window.lb, args)
	}
	public describe<T extends string>(name: T) {
		const cmd = this.retrieve(name)
		const loc = cmd.source
			? `defined at <${cmd.source}:${cmd.line}:${cmd.column}>`
			: "without a source location"

		return `\`${name}\` is a${
			cmd.interactive ? "n interactive" : ""
		} command ${loc}.\n\n${cmd.doc ?? ""}`
	}
}

export default new Commands()
