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
	read: (path: string | URL) => Promise<Uint8Array> | Uint8Array
	write: (path: string | URL, bytes: Uint8Array) => Promise<void> | void
	list: (path: string | URL) => Promise<LbDirEntry[]> | LbDirEntry[]
	stat: (path: string | URL) => Promise<LbFilesystemStat> | LbFilesystemStat
	mkdir: (
		path: string | URL,
		options?: {parents?: boolean}
	) => Promise<void> | void
	rm: (
		path: string | URL,
		options?: {recursive?: boolean; force: boolean}
	) => Promise<void> | void
}

export interface LbEnvironment extends LbFilesystemLibrary {
	protocol: string // "file:" or "opfs:"
	env: Record<string, string>
	cwd: string | URL
	systemDirectory: string | URL
	userDirectory: string | URL

	install(): Promise<void> | void
	uninstall(): Promise<void> | void
}

declare global {
	var __lb_env: Record<LbEnvironment["protocol"], LbEnvironment>
	var __lb_native_env: LbEnvironment
}

window.__lb_env = window.__lb_env || {}
window.__lb_importmap = window.__lb_importmap || {imports: {}, scopes: {}}

var envs = ["taurifs", "opfs"] as const

var count = 0
performance.mark("bookstrap->start")
for (var env of envs) {
	var url = `/envs/${env}/${env}.js`
	var script = document.createElement("script")
	script.src = url
	window.addEventListener(`__lb_env:${env}`, () => {
		count++
		if (count === envs.length) {
			window.dispatchEvent(new Event("__lb_env"))
		}
	})
	document.head.appendChild(script)
	setTimeout(() => {
		window.dispatchEvent(new Event("__lb_env"))
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
