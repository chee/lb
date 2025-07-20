import type {Littlebook} from "littlebook"
import type {
	LittlebookHandle,
	LittlebookHandleForURL,
	LittlebookHandleMap,
} from "./handle.ts"
import WarningMap from "./structures/warning-map.ts"

export type Protocol = keyof LittlebookHandleMap

export type ProtocolHandler = <U extends URL>(
	url: U
) => Promise<LittlebookHandleForURL<U> | LittlebookHandle>

// todo hmm some kind of "native local protocol" ?
// tauri's is file, web's is opfs?

export default class ProtocolHandlers {
	_handlers = new WarningMap<string, ProtocolHandler>("protocol handler")

	constructor() {}

	register(protocol: Protocol, handler: ProtocolHandler): void {
		this._handlers.set(protocol, handler)
	}

	get(protocol: Protocol): ProtocolHandler | undefined {
		return this._handlers.get(protocol)
	}

	has(protocol: Protocol): boolean {
		return this._handlers.has(protocol)
	}
	importmap: Record<string, URL> = {}

	url<P extends string>(
		url: `${P}:${string}`,
		base?: string | URL
	): URL & {protocol: `${P}:`} {
		return new URL(url, base) as URL & {protocol: `${P}:`}
	}
}
