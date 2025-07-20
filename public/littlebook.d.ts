type Debugger = typeof console.log & {extend: (name: string) => Debugger}

interface LittlebookGlobal extends EventTarget {
	surface: LittlebookSurface | null
	surfaceLayer: LittlebookSurfaceLayer | null
	surfaces: Map<string, LittlebookSurface>
	surfaceLayers: Map<string, LittlebookSurfaceLayer>

	setenv: (name: string, value: any) => void
	getenv: (name: string) => any
	defvar<T>(name: string, initialValue?: T, doc?: string): void
	defcmd: (
		name: string,
		cmd: (...args: any[]) => any,
		description?: string
	) => void
	getcmd: (name: string) => (...args: any[]) => any
	set: (name: string, value: any) => void
	get: (name: string) => any
	changeDirectory: (path?: string) => Promise<void>
	describeCommand?: (name: string) => string | undefined
	logger: Debugger
	style: (url: string) => void
	views: WarningMap<string, {element: HTMLElement}>
	associations: Matchmaker<string, {element: HTMLElement}>
	defineCommand: (
		name: string,
		cmd: (...args: any[]) => any,
		description?: string
	) => void
	defineSetting: (name: string, value?: any) => void
	registerView: (
		name: string,
		view: (
			surface: LittlebookSurface
		) => Promise<LittlebookSurface & {element: HTMLElement}>
	) => void
	associate: (pattern: [RegExp, string]) => void
	changeDirectory: (path?: string) => Promise<void>
	areas: {
		[name: string]: HTMLElement
	}
	registerSurfaceLayer: (
		name: string,
		callback: (element: HTMLElement) => LittlebookSurfaceLayer
	) => void
	call(name: string, ...args: any[]): Promise<any> | undefined
}

declare var lb: LittlebookGlobal
declare var LittlebookGlobal: LittlebookGlobal
declare var setenv: LittlebookGlobal["setenv"]
declare var getenv: LittlebookGlobal["getenv"]
declare var defvar: LittlebookGlobal["defvar"]
declare var defcmd: LittlebookGlobal["defcmd"]
declare var getcmd: LittlebookGlobal["getcmd"]
declare var call: LittlebookGlobal["call"]
declare var set: LittlebookGlobal["set"]
declare var get: LittlebookGlobal["get"]
declare var changeDirectory: LittlebookGlobal["changeDirectory"]
