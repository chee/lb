import "./styles/styles.css"
import {createProtocolHandlerRegistry} from "./protocol.ts"
import type {LbHandlemap, LbResourceHandle, LbFilehandle} from "./handle.ts"
import createDebug from "./logger.ts"
import {createRegistry} from "./structures/registry.ts"
import {mime} from "./mimes.ts"
export type * from "./protocol.ts"
export type * from "./handle.ts"
const native = window.__lb_native_env
import {TextEditor} from "../stdlib/views/text-editor/text-editor.ts"

window.addEventListener("keydown", e => {
	if (e.key == "r" && e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey) {
		location.reload()
	}
})
const logger = createDebug("littlebook")

export function createEventEmitter<T>(): LbEmitter<T> {
	const events = new EventTarget()
	return {
		on<K extends keyof T>(
			event: K,
			listener: (this: LbEmitter<T>, payload: T[K]) => any
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

export interface LbEmitter<T> {
	on<K extends keyof T>(
		event: K,
		listener: (this: LbEmitter<T>, payload: T[K]) => any
	): () => void
	emit<K extends keyof T>(event: K, payload: T[K]): void
}

type NativeElement = HTMLElement

export interface LbSurfacePrivate {}

export interface LbSurfaceEventsMap {
	rename: string
	focus: void
	destroy: void
	refit: void
	place: void
}

export interface LbSurface<H extends LbResourceHandle = LbResourceHandle> {
	id: string
	modes: LbMode[]
	events: LbEmitter<LbSurfaceEventsMap>
	name?: string
	layer?: LbSurfaceLayer
	handle?: H
	// todo the element isn't available anywhere? maybe .element is preferable .render on view?
	// or .render(): Element | Promise<Element> which also sets view.element?
	view?: LbView
	private: LbSurfacePrivate

	// todo think about unsaved state, mtime at open, etc
}

export interface LbView<H extends LbResourceHandle = LbResourceHandle> {
	name: string
	render(element: NativeElement): Promise<void> | void
	surface?: LbSurface<H>
	refit?(): void
	focus?(): void
	destroy?(): void
}

export type LbViewCreator<H extends LbResourceHandle = LbResourceHandle> =
	| (new (surface: LbSurface<H>) => LbView<H>)
	| ((surface: LbSurface<H>) => LbView<H>)

function isViewClass(
	viewer: LbViewCreator
): viewer is new (surface: LbSurface) => LbView {
	return viewer.toString().slice(0, 5) == "class"
}

export interface LbSurfaceLayer<S = unknown> {
	element: NativeElement
	place(id: string): void
	remove(id: string): void
	save(): S
	restore(snapshot: S): void
	focus(id: string): void
}

// idk what these have on them yet other than codemirrorExtensions
// maybe keybindings and commands? a keyboard map (user configurable)?
export interface LbMode {
	name: string
}

export type LbModeCreator =
	| (new (surface: LbSurface) => LbMode)
	| ((surface: LbSurface) => LbMode)

function isModeClass(
	moder: LbModeCreator
): moder is new (surface: LbSurface) => LbMode {
	return moder.toString().slice(0, 5) == "class"
}

export interface LbAreas {
	main: HTMLElement
	echo: HTMLElement
}

export interface LbEventsMap {
	focus: string
	"change-directory": URL
	[key: `env:${string}`]: string
}

export interface LbExtensions {}

export type LbEvents<T extends keyof LbEventsMap> = LbEventsMap[T]

export class LbEnvironmentContext {}

export class LittlebookHTML {
	areas = {} as LbAreas

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

	appendElements(...elements: HTMLElement[]) {
		this.areas.main.append(...elements)
	}
}

export interface SerializedSurface {
	id: string
	name?: string
	url: string
	view?: string
}

export class Littlebook {
	extensions: LbExtensions = {} as LbExtensions
	events = createEventEmitter<LbEventsMap>()
	log = logger
	protocol = createProtocolHandlerRegistry()
	renderer = new LittlebookHTML()
	modes = createRegistry<LbResourceHandle, LbModeCreator>("mode")
	views = createRegistry<LbResourceHandle, LbViewCreator>("view")
	nativefs = native

	constructor() {
		try {
			const lb = this
			globalThis.lb = lb
			globalThis.littlebook = lb
		} catch (error) {
			console.error(error)
		}
	}

	async open(
		url: URL | string,
		options: {
			id?: string
			focus?: boolean
			layer?: string
			view?: string
		} = {}
	) {
		if (typeof url == "string") {
			url = new URL(url, this.workingDirectory)
		}
		const id = Math.random().toString(36).slice(2)
		let layer: LbSurfaceLayer
		this.log(`opening ${url} with id ${id}`)
		if (options.layer) {
			const lay = this.getLayer(options.layer)
			if (!lay) {
				console.warn(`no layer named "${options.layer}"`)
			}
			layer = lay
		} else {
			layer = this.currentLayer
		}
		if (!layer) {
			console.warn("no surface layer found, using main area")
			layer = this.defaultLayer
		}

		const handler = this.protocol.get(url.protocol as keyof LbHandlemap)
		if (!handler) {
			throw new Error(`no protocol handler for "${url.protocol}"`)
		}
		const handle = (await handler(url)) as LbResourceHandle

		if (!handle) {
			throw new Error(`no handle for "${url}"`)
		}
		const parts = handle.url.pathname.split("/")
		const name = parts[parts.length - 1]
		// todo this needs to be in some kind of createSurface function
		const Modes = this.modes.findAll(handle) ?? []

		const surface = this.createSurface({
			id,
			name,
			layer,
			handle,
		})

		this.addSurface(surface)

		for (const Mode of Modes) {
			isModeClass(Mode)
				? surface.modes.push(new Mode(surface))
				: surface.modes.push(Mode(surface))
		}

		let View: LbViewCreator
		if (options.view) {
			View = this.views[options.view]
			if (!View) {
				throw new Error(`no view named "${options.view}"`)
			}
		} else {
			View = this.views.find(handle, "xyz.littlebook.text-editor") || TextEditor
		}
		if (!View) {
			throw new Error(`no view for handle "${handle.url}"`)
		}
		const view = isViewClass(View) ? new View(surface) : View(surface)
		view.surface = surface
		surface.view = view
		layer.place(surface.id)
	}

	surfaces = {} as Record<string, LbSurface>
	addSurface(surface: LbSurface) {
		if (this.surfaces[surface.id]) {
			throw new Error(`Surface with id "${surface.id}" already exists.`)
		}
		this.surfaces[surface.id] = surface
	}

	getSurface(id: string): LbSurface | undefined {
		return this.surfaces[id]
	}

	createSurface(template: Partial<LbSurface> = {}): LbSurface {
		return {
			id: template.id ?? Math.random().toString(36).slice(2),
			modes: template.modes ?? [],
			private: template.private ?? {},
			events: template.events ?? createEventEmitter<LbSurfaceEventsMap>(),
			...template,
		}
	}

	serializeSurfaces(): SerializedSurface[] {
		return Object.values(this.surfaces).map(surface => ({
			id: surface.id,
			name: surface.name,
			url: surface.handle?.url.toString(),
		}))
	}

	restoreSurfaces(data: SerializedSurface[]) {
		for (const item of data) {
			lb.open(item.url, {
				id: item.id,
				focus: false,
				view: item.view,
			})
		}
	}

	serialize() {
		return {
			surfaces: this.serializeSurfaces?.(),
		}
	}
	saveState() {
		localStorage.setItem(
			`littlebook-state:${this.workingDirectory}`,
			JSON.stringify(this.serialize())
		)
	}

	loadState() {
		const state = localStorage.getItem(
			`littlebook-state:${this.workingDirectory}`
		)
		if (state) {
			try {
				const data = JSON.parse(state)
				this.restoreSurfaces?.(data.surfaces)
			} catch (error) {
				console.error("Failed to load state:", error)
			}
		}
	}

	layers = {} as Record<string, LbSurfaceLayer>
	currentLayer: LbSurfaceLayer | null = null
	registerLayer(
		name: string,
		callback: (element: NativeElement) => LbSurfaceLayer,
		options?: {auto?: boolean}
	) {
		if (this.layers[name]) {
			console.warn(`Overwriting surface layer "${name}". did u mean to?`)
		}
		const el = lb.renderer.createElement(name.split("").join("-"), {
			role: "region",
		})
		const layer = callback(el)
		this.layers[name] = layer
		if (options?.auto !== false) {
			this.currentLayer = layer
			lb.renderer.appendElements(el)
		}
		layer.element = el
		return layer
	}
	getLayer(name: string): LbSurfaceLayer | undefined {
		return this.layers[name]
	}

	workingDirectory = new URL(".", native.cwd)
	environmentVariables: Record<string, string> = native.env ?? {}

	changeDirectory(url: URL): void {
		this.workingDirectory = url
		lb.events.emit("change-directory", url)
	}

	getEnv(name: string): any {
		return this.environmentVariables[name]
	}

	setEnv(name: string, value: string): void {
		this.environmentVariables[name] = value
		lb.events.emit(`env:${name}`, value)
	}
}

try {
	//	new Littlebook(system)
} catch (error) {
	console.error("Failed to initialize Littlebook:", error)
}

export default new Littlebook()

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
lb.protocol.register(native.protocol, async (url: URL) => {
	try {
		const content = native.read(url)
		return {
			url,
			ok: true,
			body: null,
			bodyUsed: false,
			async blob() {
				return new Blob([await content], {type: mime(url.toString())})
			},
			async bytes() {
				return content
			},
			async json() {
				const bytes = await content
				return JSON.parse(textDecoder.decode(bytes))
			},
			async text() {
				const bytes = await content
				return textDecoder.decode(bytes)
			},
			async stat() {
				return native.stat(url)
			},
			async save(data: Uint8Array | string) {
				if (typeof data == "string") {
					lb.log("saving text", textEncoder.encode(data).length)
					await native.write(url, textEncoder.encode(data))
				} else {
					lb.log("saving bytes")
					await native.write(url, data)
				}
			},
		} satisfies LbFilehandle
	} catch (error) {
		return {ok: false, url}
	}
})

if (native.protocol == "taurifs:") {
	lb.protocol.register("file:", lb.protocol.get("taurifs:" as "file:")!)
}

;(async () => {
	const {DockviewSurfaceLayer} = await import("../stdlib/layers/dock/dock.ts")
	const {TextEditor} = await import(
		"../stdlib/views/text-editor/text-editor.ts"
	)
	DockviewSurfaceLayer.use()
	TextEditor.use()
	await lb.open(native.systemDirectory.toString().concat("core/entrypoint.ts"))
	const file = await native.read(
		native.systemDirectory.toString().concat("stdlib/test.ts")
	)
})()

declare global {
	var lb: Littlebook
	var littlebook: Littlebook
	interface Window {
		lb: Littlebook
		littlebook: Littlebook
	}
}
