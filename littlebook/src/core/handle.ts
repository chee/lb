export interface LittlebookHandle {
	readonly url: URL
	readonly ok: boolean
}

// todo FileHandle might be part of stdlib
export interface LittlebookFileHandle extends LittlebookHandle {
	readonly body: ReadableStream<Uint8Array> | null
	readonly bodyUsed: boolean
	blob(): Promise<Blob>
	bytes(): Promise<Uint8Array>
	json(): Promise<any>
	text(): Promise<string>
	stat(): Promise<{
		size: number
		type: string
		lastModified: Date
	}>
	save(string: string): Promise<void>
	save(bytes: Uint8Array): Promise<void>
}

export interface LittlebookHandleMap {
	"file:": LittlebookFileHandle
}

export type LittlebookHandleForURL<T extends URL | string> = T extends URL & {
	protocol: infer P extends keyof LittlebookHandleMap
}
	? LittlebookHandleMap[P]
	: T extends `${infer P extends keyof LittlebookHandleMap}${string}`
	? LittlebookHandleMap[P]
	: LittlebookHandle
