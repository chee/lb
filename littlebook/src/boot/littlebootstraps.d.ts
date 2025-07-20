declare interface LittlebookHost {
	read: (path: string | URL) => Promise<string>
	write: (path: string | URL, bytes: Uint8Array) => Promise<void>
	list: (
		path: string | URL
	) => Promise<{name: string; type: "file" | "directory" | "link"}[]>
	stat: (path: string | URL) => Promise<{
		size: number
		modified: Date
		type: "file" | "directory" | "link"
	}>
	env: Record<string, string>
	cwd: string | URL
	mkdir: (path: string | URL, options?: {parents?: boolean}) => Promise<void>
	systemDirectory: string | URL
	userDirectory: string | URL
	protocol: string // "file:" or "opfs:"
}

declare function __littlebootstrap(host: LittlebookHost): Promise<void>

declare var __littlebook: {
	host: LittlebookHost
	esbuild: typeof esbuild
	bundle: (path: string, options: BuildOptions) => Promise<BuildResult>
}
