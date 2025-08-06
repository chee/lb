var __lb = {}
window.__lb = __lb as LbPrivate

export type LbFilesystemFileType = "file" | "directory" | "link"
export interface LbFilesystemStat {
	size: number
	modified: Date | null
	readonly: boolean
	type: LbFilesystemFileType
}
export interface LbDirEntry {
	name: string
	type: LbFilesystemFileType
}

export interface LbFilesystemLibrary {
	read(path: string | URL): Promise<Uint8Array>
	write(
		path: string | URL,
		bytes: Uint8Array | ReadableStream<Uint8Array> | string
	): Promise<void>
	list(path: string | URL): Promise<LbDirEntry[]>
	stat(path: string | URL): Promise<LbFilesystemStat>
	mkdir(path: string | URL, options?: {parents?: boolean}): Promise<void> | void
	rm(
		path: string | URL,
		options?: {recursive?: boolean; force: boolean}
	): Promise<void> | void
	// getFile(path: string | URL, options: {create?: true}): Promise<File>
	stream(path: string | URL): Promise<ReadableStream<Uint8Array>>
	// watch?: (path: string | URL) => Promise<AsyncIterable<LbFilesystemStat>>
}

export interface LbEnvironment extends LbFilesystemLibrary {
	protocol: string // e.g. "file", "opfs", "taurifs"
	env: Record<string, string>
	cwd: string | URL
	systemDirectory: string | URL
	userDirectory: string | URL

	install(): Promise<void> | void
	uninstall(): Promise<void> | void
}

declare global {
	interface LbPrivate {
		env: Record<LbEnvironment["protocol"], LbEnvironment>
		nativeEnv: LbEnvironment
	}
}

window.__lb.env = window.__lb.env || {}
window.__lb.importmap = window.__lb.importmap || {imports: {}, scopes: {}}

var envs = ["taurifs", "opfs"] as const

var count = 0
performance.mark("bookstrap->start")
for (var env of envs) {
	var url = `/envs/${env}/${env}.js`
	var script = document.createElement("script")
	script.src = url
	window.addEventListener(`__lb.env:${env}`, () => {
		count++
		if (count === envs.length) {
			window.dispatchEvent(new Event("__lb.env"))
		}
	})
	document.head.appendChild(script)
	setTimeout(() => {
		window.dispatchEvent(new Event("__lb.env"))
	}, 5000)
}

if (
	"window" in self &&
	"LITTLEBOOK_DEV" in self &&
	!("esbuildListening" in self)
) {
	new EventSource("/esbuild").addEventListener("change", () =>
		location.reload()
	)
	// @ts-expect-error it's ok
	window.esbuildListening = true
}
