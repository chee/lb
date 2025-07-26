export interface LbHandle {
	url: string | URL
	ok: boolean
}

// todo this should be a class probably but i'm too tired to think
export interface LbFilehandle extends LbHandle {
	blob(): Promise<Blob>
	bytes(): Promise<Uint8Array>
	json(): Promise<any>
	text(): Promise<string>
	stat(): Promise<{
		size: number
		type: string
		modified: Date | null
	}>
	save(string: string): Promise<void>
	save(bytes: Uint8Array): Promise<void>
}

export interface LbHandleMap {
	"file:": LbFilehandle
}

export type LbHandleForProtocol<T extends string> = T extends keyof LbHandleMap
	? LbHandleMap[T]
	: LbHandle

export type LbHandleForURL<T extends URL | string> = T extends URL & {
	protocol: infer P extends keyof LbHandleMap
}
	? LbHandleMap[P]
	: T extends `${infer P extends keyof LbHandleMap}${string}`
	? LbHandleMap[P]
	: LbHandle
