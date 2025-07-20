import "./styles.css"

import debug from "./logger.ts"
import LittlebookProtocol from "./protocol.ts"
import WarningMap from "./structures/warning-map.ts"
import type {
	LittlebookHandleMap,
	LittlebookHandle,
	LittlebookFileHandle,
} from "./handle.ts"
export type * from "./protocol.ts"
export type * from "./handle.ts"
import Registry from "./structures/registry.ts"

const logger = debug("littlebook")
console.log("hello worlda")

export function createEventEmitter<T>(): LittlebookEventTarget<T> {
	const events = new EventTarget()
	return {
		on<K extends keyof T>(
			event: K,
			listener: (this: LittlebookEventTarget<T>, payload: T[K]) => any
		): () => void {
			function listen(event: CustomEvent<T[K]>) {
				listener.call(this, event.detail)
			}
			events.addEventListener(event.toString(), listen)
			return () => events.removeEventListener(event.toString(), listen)
		},
		emit<K extends keyof T>(event: K, payload: T[K]): void {
			events.dispatchEvent(new CustomEvent(event.toString(), {detail: payload}))
		},
	}
}

export interface LittlebookEventTarget<T> {
	on<K extends keyof T>(
		event: K,
		listener: (this: LittlebookEventTarget<T>, payload: T[K]) => any
	): () => void
	emit<K extends keyof T>(event: K, payload: T[K]): void
}

type NativeElement = HTMLElement

export interface LittlebookSurfacePrivate {}

export interface LittlebookSurfaceEventsMap {
	rename: string
	focus: void
	destroy: void
	refit: void
	place: void
}

export interface LittlebookSurface<
	H extends LittlebookHandle = LittlebookHandle
> {
	id: string
	modes: LittlebookMode[]
	events: LittlebookEventTarget<LittlebookSurfaceEventsMap>
	name?: string
	layer?: LittlebookSurfaceLayer
	handle?: H
	// todo the element isn't available anywhere? maybe .element is preferable .render on view?
	// or .render(): Element | Promise<Element> which also sets view.element?
	view?: LittlebookView
	private: LittlebookSurfacePrivate

	// todo think about unsaved state, mtime at open, etc
}

export interface LittlebookView<H extends LittlebookHandle = LittlebookHandle> {
	name: string
	render(element: NativeElement): Promise<void> | void
	surface?: LittlebookSurface<H>
	refit?(): void
	focus?(): void
	destroy?(): void
}

export type CreateLittlebookView<
	H extends LittlebookHandle = LittlebookHandle
> = (
	surface: LittlebookSurface<H>
) => LittlebookView<H> | Promise<LittlebookView<H>>

export interface LittlebookSurfaceLayer<S = unknown> {
	element: NativeElement
	place(id: string): void
	remove(id: string): void
	save(): S
	restore(snapshot: S): void
	focus(id: string): void
}

// idk what these have on them yet other than codemirrorExtensions
// maybe keybindings and commands? a keyboard map (user configurable)?
export interface LittlebookMode {
	name: string
}

export type CreateLittlebookMode<
	H extends LittlebookHandle = LittlebookHandle
> = (surface: LittlebookSurface<H>) => LittlebookMode | Promise<LittlebookMode>

export interface LittlebookAreas {
	main: HTMLElement
	echo: HTMLElement
}

export interface LittlebookEventsMap {
	focus: string
	"change-directory": URL
	[key: `env:${string}`]: string
}

export interface LittlebookExtensions {}

export type LittlebookEvents<T extends keyof LittlebookEventsMap> =
	LittlebookEventsMap[T]

export class LittlebookEnvironment {
	constructor(
		public workingDirectory: URL = new URL(".", import.meta.url),
		public readonly variables: Record<string, string> = {}
	) {}

	changeDirectory(url: URL): void {
		this.workingDirectory = url
		lb.events.emit("change-directory", url)
	}

	get(name: string): any {
		return this.variables[name]
	}

	set(name: string, value: string): void {
		this.variables[name] = value
		lb.events.emit(`env:${name}`, value)
	}
}

export class LittlebookHTML {
	areas: LittlebookAreas = {} as LittlebookAreas

	constructor(public root = document.body) {
		this.areas.main = this.createElement("e-d-i-t", {role: "main"})
		this.areas.echo = this.createElement("e-c-h-o", {
			role: "status",
			"aria-live": "polite",
		})
		this.root.append(this.areas.main, this.areas.echo)
	}

	createElement(
		name: string,
		attributes?: Record<string, any>,
		props?: Record<string, any>
	) {
		const el = document.createElement(name)
		if (attributes) {
			for (const [key, value] of Object.entries(attributes)) {
				el.setAttribute(key, value)
			}
		}
		if (props) {
			Object.assign(el, props)
		}
		return el
	}

	append(...elements: HTMLElement[]) {
		this.areas.main.append(...elements)
	}
}

export class LittlebookLayers {
	private _registry = new WarningMap<string, LittlebookSurfaceLayer>(
		"surface layer"
	)
	current: LittlebookSurfaceLayer | null = null
	register(
		name: string,
		callback: (element: NativeElement) => LittlebookSurfaceLayer,
		options?: {auto?: boolean}
	) {
		const el = lb.renderer.createElement(name.split("").join("-"), {
			role: "region",
		})
		const layer = callback(el)
		if (!this.current) {
			this.current = layer
		}
		this._registry.set(name, layer)
		if (options?.auto !== false) {
			lb.renderer.append(el)
		}
		layer.element = el
		return layer
	}
	get(name: string): LittlebookSurfaceLayer | undefined {
		return this._registry.get(name)
	}

	fallback: LittlebookSurfaceLayer = (function () {
		const elements = new Map<string, HTMLElement>()
		function place(id: string) {
			const el = document.createElement("little-surface")
			el.id = id
			lb.surfaces.get(id).view.render(el)
			lb.renderer.append(el)
			elements.set(id, el)
		}
		return {
			get element() {
				return lb.renderer.areas.main
			},
			place,
			remove(id: string) {
				const el = document.getElementById(id)
				if (el) {
					el.remove()
				}
				elements.delete(id)
			},
			save() {
				return [...elements.keys()]
			},
			restore(items: string[]) {
				for (const id of items) place(id)
			},
			focus(id: string) {
				this._elements.get(id)?.focus()
			},
		}
	})()
}

export class LittlebookSurfaces {
	private _surfaces = new WarningMap<string, LittlebookSurface>("surface")
	add(surface: LittlebookSurface) {
		this._surfaces.set(surface.id, surface)
	}
	get(id: string): LittlebookSurface | undefined {
		return this._surfaces.get(id)
	}
	create(template: Partial<LittlebookSurface> = {}): LittlebookSurface {
		return {
			id: template.id ?? Math.random().toString(36).slice(2),
			modes: template.modes ?? [],
			private: template.private ?? {},
			events:
				template.events ?? createEventEmitter<LittlebookSurfaceEventsMap>(),
			...template,
		}
	}
}

export class Littlebook {
	extensions: LittlebookExtensions = {} as LittlebookExtensions
	events = createEventEmitter<LittlebookEventsMap>()
	log = logger
	environment: LittlebookEnvironment
	modes = new Registry<
		LittlebookHandle,
		{new (surface: LittlebookSurface): LittlebookMode}
	>("mode")
	protocol = new LittlebookProtocol()
	renderer = new LittlebookHTML()
	surfaces = new LittlebookSurfaces()
	layers = new LittlebookLayers()
	views = new Registry<
		LittlebookHandle,
		{
			new <T extends LittlebookHandle>(
				surface: LittlebookSurface
			): LittlebookView<T>
		}
	>("view")

	constructor(options: {
		workingDirectory?: URL
		environmentVariables?: Record<string, string>
	}) {
		this.environment = new LittlebookEnvironment(
			options.workingDirectory,
			options.environmentVariables
		)

		try {
			const lb = this
			globalThis.lb = lb
			globalThis.littlebook = lb
		} catch (error) {
			console.error(error)
		}
	}

	async open(
		url: URL,
		options: {
			id?: string
			focus?: boolean
			layer?: string
			view?: string
		} = {}
	) {
		const id = Math.random().toString(36).slice(2)
		let layer: LittlebookSurfaceLayer
		this.log(`opening ${url} with id ${id}`)
		if (options.layer) {
			const lay = this.layers.get(options.layer)
			if (!lay) {
				console.warn(`no layer named "${options.layer}"`)
			}
			layer = lay
		} else {
			layer = this.layers.current
		}
		if (!layer) {
			console.warn("no surface layer found, using main area")
			layer = this.layers.fallback
		}

		const handler = this.protocol.get(url.protocol as keyof LittlebookHandleMap)
		if (!handler) {
			throw new Error(`no protocol handler for "${url.protocol}"`)
		}
		const handle = (await handler(url)) as LittlebookHandle

		if (!handle) {
			throw new Error(`no handle for "${url}"`)
		}
		const parts = handle.url.pathname.split("/")
		const name = parts[parts.length - 1]
		// todo this needs to be in some kind of createSurface function
		const Modes = this.modes.findAll(handle) ?? []

		const surface = this.surfaces.create({
			id,
			name,
			layer,
			handle,
		})
		this.surfaces.add(surface)
		for (const Mode of Modes) {
			// new Mode(surface) also sets surface.modes+=itself
			new Mode(surface)
		}
		let View: {new (s: typeof surface): LittlebookView<typeof handle>}
		if (options.view) {
			View = this.views.get(options.view)
			if (!View) {
				throw new Error(`no view named "${options.view}"`)
			}
		} else {
			View = this.views.find(handle)
		}
		if (!View) {
			throw new Error(`no view for handle "${handle.url}"`)
		}
		const view = new View(surface)
		view.surface = surface
		surface.view = view
		layer.place(surface.id)
	}
}

/*
todo imagine this section happens in some other place
 */

const system = {
	workingDirectory: (await window.__TAURI__?.core.invoke(
		"initial_working_directory"
	)) as URL,
	environmentVariables: (await window.__TAURI__?.core.invoke(
		"initial_environment_variables"
	)) as Record<string, string>,
}

try {
	//	new Littlebook(system)
} catch (error) {
	console.error("Failed to initialize Littlebook:", error)
}

export default new Littlebook(system)

const tauri = window.__TAURI__
if (tauri) {
	lb.protocol.register("file:", async (url: URL) => {
		try {
			const content = tauri.fs.readFile(url)
			return {
				url,
				ok: true,
				body: null,
				bodyUsed: false,
				async blob() {
					const bytes = await content
					return new Blob([bytes], {type: "application/octet-stream"})
				},
				async bytes() {
					return content
				},
				async json() {
					const bytes = await content
					return JSON.parse(new TextDecoder().decode(bytes))
				},
				async text() {
					const bytes = await content
					return new TextDecoder().decode(bytes)
				},
				async stat() {
					const metadata = await tauri.fs.stat(url)
					return {
						size: metadata.size,
						type: metadata.isDirectory ? "directory" : "file",
						lastModified: metadata.mtime,
					}
				},
				async save(data: Uint8Array | string) {
					if (typeof data == "string") {
						await tauri.fs.writeTextFile(url, data)
					} else {
						await tauri.fs.writeFile(url, data)
					}
				},
			} satisfies LittlebookFileHandle
		} catch (error) {
			return {ok: false, url}
		}
	})
}

;(async () => {
	console.log(import.meta.url)
	const {DockviewSurfaceLayer} = await import("../stdlib/layers/dock.ts")
	const {TextEditor} = await import(
		"../stdlib/views/text-editor/text-editor.ts"
	)
	DockviewSurfaceLayer.use()
	TextEditor.use()
})()

declare global {
	var lb: Littlebook
	var littlebook: Littlebook
	interface Window {
		lb: Littlebook
		littlebook: Littlebook
	}
}
