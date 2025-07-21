import type {
	LbResourceHandle,
	LbHandleForProtocol,
	LbHandlemap as LbHandleMap,
} from "./handle.ts"

export type Protocol = keyof LbHandleMap

export type ProtocolHandler<P extends string> = (
	url: `${P}:${string}` | (URL & {protocol: P})
) => Promise<
	P extends keyof LbHandleMap ? LbHandleForProtocol<P> : LbResourceHandle
>

export function createProtocolHandlerRegistry() {
	const handlers: Record<string, ProtocolHandler<any>> = {}

	return {
		handlers,
		register<T extends string>(protocol: T, handler: ProtocolHandler<T>): void {
			if (handlers[protocol]) {
				console.warn(
					`overwriting protocol handler for ${protocol}. probably chill`
				)
			}
			handlers[protocol] = handler
		},
		get(protocol: Protocol): ProtocolHandler<any> | undefined {
			return handlers[protocol]
		},
		has(protocol: Protocol): boolean {
			return protocol in handlers
		},
		url<P extends string>(
			url: `${P}:${string}`,
			base?: string | URL
		): URL & {protocol: `${P}:`} {
			return new URL(url, base) as URL & {protocol: `${P}:`}
		},
	}
}

export default class ProtocolHandlers {}
