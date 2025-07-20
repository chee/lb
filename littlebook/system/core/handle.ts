export interface LbHandle {
	readonly url: URL
	readonly ok: boolean
}

// todo FileHandle might be part of stdlib
export interface LbFilehandle extends LbHandle {
	readonly body: ReadableStream<Uint8Array> | null
	readonly bodyUsed: boolean
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

export interface LbHandlemap {
	"file:": LbFilehandle
}

export type LbHandleForProtocol<T extends string> = T extends keyof LbHandlemap
	? LbHandlemap[T]
	: LbHandle

export type LbHandleForURL<T extends URL | string> = T extends URL & {
	protocol: infer P extends keyof LbHandlemap
}
	? LbHandlemap[P]
	: T extends `${infer P extends keyof LbHandlemap}${string}`
	? LbHandlemap[P]
	: LbHandle
