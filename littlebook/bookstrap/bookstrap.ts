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

export interface LbContext<Fn extends (...args: any[]) => ReturnType<Fn>> {
	name: string
	parent?: LbContext<any>
	fn: Fn
	value?: ReturnType<Fn>
	stack: StackFrame[]
	children: LbContext<any>[]
	meta: Record<string, any>
}

declare global {
	var __lb_env: Record<LbEnvironment["protocol"], LbEnvironment>
	var __lb_native_env: LbEnvironment
}

window.__lb_env = window.__lb_env || {}
window.__lb_importmap = window.__lb_importmap || {imports: {}, scopes: {}}

var envs = ["taurifs", "opfs"] as const

var count = 0
performance.mark("bookstrap:start")
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

self.__lb_context = null

function __lb_withContext<
	Fn extends (context: LbContext<Fn>) => ReturnType<Fn>
>(name: string, fn: Fn): ReturnType<Fn> {
	const parent = self.__lb_context

	const context: LbContext<Fn> = {
		name: `${parent ? parent.name + ":" : ""}${name}`,
		stack: parseStack(new Error().stack || ""),
		children: [],
		parent,
		fn,
		meta: {},
	}

	self.__lb_context?.children.push(context)
	self.__lb_context = context

	performance.mark(`${name}->start`)
	try {
		context.value = fn(context)
		return fn(context)
	} finally {
		self.__lb_context = self.__lb_context.parent
		performance.mark(`${name}->end`)
	}
}

self.__lb_withContext = __lb_withContext

declare global {
	var __lb_context: LbContext<any> | null
	function __lb_withContext<
		Fn extends (context: LbContext<Fn>) => ReturnType<Fn>
	>(name: string, fn: Fn): ReturnType<Fn>
}

if (
	"window" in self &&
	// @ts-expect-error shhhh baby it ok
	self.LITTLEBOOK_DEV
) {
	new EventSource("/esbuild").addEventListener("change", () =>
		location.reload()
	)
}

function parseStack(stack: string) {
	if (stack.match(/^\s*at .*(\S+:\d+|\(native\))/m)) {
		return parseV8(stack)
	}
	return parseGeckoWebkit(stack)
}

export interface StackFrame {
	source?: string
	line?: number
	column?: number
}

function parseV8(stack: string): StackFrame[] {
	return stack
		.split("\n")
		.slice(1)
		.map(line => {
			const match = line.match(/ \((.+):(\d+):(\d+)\)/)
			if (match) {
				return {
					source: match[2],
					line: parseInt(match[3], 10),
					column: parseInt(match[4], 10),
				}
			} else {
				return {}
			}
		})
}

function parseGeckoWebkit(stack: string): StackFrame[] {
	return stack.split("\n").map(line => {
		if (line == "global code@") {
			return {}
		}
		const match = line.match(/@(.+):(\d+):(\d+)/)
		if (match) {
			return {
				source: match[1],
				line: parseInt(match[2], 10),
				column: parseInt(match[3], 10),
			}
		} else {
			return {}
		}
	})
}
