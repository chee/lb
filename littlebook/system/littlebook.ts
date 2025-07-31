import "./littlebook.css"
import {createElement} from "/littlebook:system/packages/utility/create-element.ts"
import {createEmitter} from "/littlebook:system/packages/utility/emitter.ts"
import createLogger from "/littlebook:system/packages/utility/logger.ts"
import {resolvePath} from "/littlebook:system/packages/utility/resolve-path.ts"
import {LbSet} from "/littlebook:system/packages/utility/set.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type BytesOp = {agent: string; pos: number; content: number[]}

export type TextOp = {agent: string; from: number; to: number; content?: string}

export type Op = TextOp | BytesOp | void

export interface Area<S = unknown> {
	element: HTMLElement
	place(id: string): void
	remove(id: string): void
	restore(snapshot: S): void
	save(): S
	focus(id: string): void
	name?(id: string, name: string): void
}

export interface LittlebookEventsMap {
	focus: string
	"change-directory": URL
	[key: `env:${string}`]: string
	preparesurface: Surface<any>
	surface: Surface<any>
}

export type LittlebookEvents<T extends keyof LittlebookEventsMap> =
	LittlebookEventsMap[T]

export const log = createLogger("littlebook")
export const events = createEmitter<LittlebookEventsMap>()
export const nativefs = window.__lb_native_env

export let workingDirectory = new URL(".", nativefs.cwd)
export const environmentVariables: Record<string, string> = nativefs.env ?? {}

export function changeDirectory(url: URL): void {
	workingDirectory = url
	events.emit("change-directory", url)
}

export function getEnv(name: string): any {
	return environmentVariables[name]
}

export function setEnv(name: string, value: string): void {
	environmentVariables[name] = value
	events.emit(`env:${name}`, value)
}

export type SetOp<T> = {type: "set"; content: T}

export interface IOpstream<Type = any, OpType extends Op = Op> {
	parent: IOpstream | Source | null
	value: Type
	connect(callback: (event: SetOp<Type> | OpType) => void): () => void
	apply(op: OpType): void
}

export class Opstream<Type, OpType extends Op>
	implements IOpstream<Type, OpType>
{
	value: Type
	parent: Source | IOpstream | null
	emitter = createEmitter<{op: OpType | SetOp<Type>}>()
	constructor(initialValue: Type, parent: Source | IOpstream | null = null) {
		this.value = initialValue
		this.parent = parent
	}
	connect(callback: (op: OpType) => void) {
		this.emitter.on("op", callback)
		//		callback({type: "set", content: this.value})
		return () => {
			this.emitter.off("op", callback)
		}
	}
	apply(op: OpType) {
		this.emitter.emit("op", op)
	}
}

export interface IOpstreamBytes extends IOpstream<Uint8Array, BytesOp> {}
export class OpstreamBytes
	extends Opstream<Uint8Array, BytesOp>
	implements IOpstreamBytes
{
	constructor(bytes: Uint8Array, parent: Source | OpstreamBytes | null = null) {
		super(bytes, parent)
	}
	apply(op: BytesOp) {
		this.value.set(op.content, op.pos)
		super.apply(op)
	}
}

export interface IOpstreamText extends IOpstream<string, TextOp> {}
export class OpstreamText
	extends Opstream<string, TextOp>
	implements IOpstreamText
{
	constructor(text: string, parent: Source | OpstreamText | null = null) {
		super(text, parent)
	}
	apply(op: TextOp) {
		this.value =
			this.value.slice(0, op.from) +
			(op.content ?? "") +
			this.value.slice(op.to)
		super.apply(op)
	}
}

class Noopstream extends Opstream<void, void> {
	apply() {}
	connect() {
		return () => {}
	}
}

export const Opstreams = {
	bytes(bytes: Uint8Array) {
		return new OpstreamBytes(bytes)
	},
	text(text: string) {
		return new OpstreamText(text)
	},
	noop() {
		return new Noopstream()
	},
}

// todo think about which parts should be sync and async
export interface Source {
	url: string
	fetched: Date
	bytes(): Uint8Array
	text(): string

	// todo should this be part of a source or not?
	writable: boolean
	write?(data: Uint8Array | string): Promise<void>
	modified?(): Promise<Date | null>
}

export type Protocol = (url: URL | string) => Promise<Source>

const protocolCache = new Map<string, Map<string, Source>>()

export const protocols: {[key: string]: Protocol} = {
	async [nativefs.protocol](url: URL | string) {
		url = url.toString()
		/** this is bytes */
		const bytes = await nativefs.read(url)
		let text: string | undefined
		return {
			url,
			fetched: new Date(),
			bytes: () => bytes,
			text() {
				if (text == null) {
					text = decoder.decode(bytes)
				}
				return text
			},
			writable: true,
			async write(data) {
				return nativefs.write(
					url,
					typeof data == "string" ? encoder.encode(data) : data
				)
			},
			async modified() {
				return (await nativefs.stat(url)).modified
			},
		}
	},
}

export type Opstreams = {
	[K in keyof typeof Opstreams]: ReturnType<(typeof Opstreams)[K]>
}

const opstreamCache = new WeakMap<
	Source,
	{
		bytes?: OpstreamBytes
		text?: OpstreamText
	}
>()

export async function find<T extends keyof typeof Opstreams = "bytes">(
	url: URL | string,
	options: {
		indirect?: boolean
		with: {type: T}
	} = {
		with: {type: "bytes" as T},
	}
): Promise<Opstreams[T]> {
	if (typeof url == "string") {
		url = resolvePath(
			url,
			nativefs,
			url.startsWith(".") ? workingDirectory : undefined
		)
	}
	const cachedURLSources = protocolCache.get(url.protocol) ?? new Map()
	const cachedSource = cachedURLSources.get(url.toString())
	// todo source will never be released
	let source = cachedSource
	if (!source) {
		const handler = protocols[url.protocol]
		if (!handler) {
			throw new Error(`no protocol handler for "${url.protocol}"`)
		}
		source = await handler(url)
		cachedURLSources.set(url.toString(), source)
		protocolCache.set(url.protocol, cachedURLSources)
	}
	const cachedOpstreams = opstreamCache.get(source)
	let opstreams = cachedOpstreams
	if (!opstreams) {
		opstreams = {}
		opstreamCache.set(source, opstreams)
	}

	if (options.with.type == "bytes") {
		if (!opstreams.bytes) {
			const bytes = source.bytes()
			const opstream = Opstreams.bytes(bytes)
			opstream.parent = source
			opstreams.bytes = opstream
		}

		return opstreams.bytes as Opstreams[T]
	} else if (options.with.type == "text") {
		if (!opstreams.text) {
			const text = source.text()
			const opstream = Opstreams.text(text)
			opstream.parent = source
			opstreams.text = opstream
		}

		return opstreams.text as Opstreams[T]
	} else {
		throw new Error(`unsupported type "${options.with.type}"`)
	}
}

export const mainElement = createElement("e-d-i-t", {
	role: "main",
})

export const echoElement = createElement("e-c-h-o", {
	role: "status",
	"aria-live": "polite",
})

document.body.append(mainElement, echoElement)
if (nativefs.protocol == "taurifs:") {
	protocols["file:"] = protocols["taurifs:"]
}

export interface Vibe {
	//keybindings: Record<string, string>
}

export interface Surface<T extends keyof Opstreams | void = void> {
	id: string
	vibes: LbSet<Vibe>
	url?: string
	opstream?: T extends keyof Opstreams ? Opstreams[T] : void
	view?: View<T>
}

export const surfaces = {} as Record<string, Surface<any>>

export function createSurface<T extends keyof Opstreams | void = void>(
	url?: string
) {
	const id = Math.random().toString(36).slice(2)
	const surface: Surface<T> = {
		id,
		url,
		vibes: new LbSet<Vibe>(),
	}
	events.emit("preparesurface", surface)
	surfaces[id] = surface
	events.emit("surface", surface)
	return surface
}

export interface View<T extends keyof Opstreams | void = void> {
	surface: Surface<T>
	opstream?: T extends keyof Opstreams ? Opstreams[T] : void
	mount(element: HTMLElement): () => void
}

export async function openSurface<T extends keyof Opstreams | void = void>(
	url: URL | string,
	View: {new (surface: Surface<T>): View<T>; optype: T},
	area: Area
) {
	url = url.toString()

	const opstream = View.optype && (await find(url, {with: {type: View.optype}}))
	const surface = createSurface<T>(url)
	surface.opstream = opstream as T extends keyof Opstreams ? Opstreams[T] : void
	surface.view = new View(surface)
	area.place(surface.id)
	return surface
}

export async function viewOpstream<T extends keyof Opstreams>(
	opstream: Opstreams[T],
	View: {new (surface: Surface<T>): View<T>; optype: T},
	area: Area
) {
	const surface = createSurface<T>()
	surface.opstream = opstream as T extends keyof Opstreams ? Opstreams[T] : void
	surface.view = new View(surface)
	area.place(surface.id)
	return surface
}

class LittleSurface extends HTMLElement {
	connectedCallback() {
		this.style.height = "100%"
		this.style.width = "100%"
		const surface = surfaces[this.id]
		if (!surface) {
			throw new Error(`Surface not found: ${this.id}`)
		}
		surface.view.mount(this)
	}
}

customElements.define("little-surface", LittleSurface)

export function createHTMLArea(element: HTMLElement): Area<string[]> {
	function place(id: string) {
		const child = createElement("little-surface", {id})
		element.appendChild(child)
	}
	function remove(id: string) {
		const child = element.querySelector(`#${id}`)
		if (child) {
			element.removeChild(child)
		}
	}
	return {
		element,
		place,
		remove,
		save() {
			return [...element.children].map(e => e.id)
		},
		restore(ids) {
			for (const id of ids) {
				place(id)
			}
		},
		focus(id: string) {
			const target = element.querySelector(`#${id}`) as HTMLElement
			target.focus()
		},
	}
}

export const areas = {
	main: createHTMLArea(mainElement),
}

window.__lb_protocols = protocols

declare global {
	var __lb_protocols: typeof protocols
}

export type Command = (...args: any[]) => any

export interface Package {
	name: string
	settings?: Record<string, any>
	commands?: Record<string, (...args: any[]) => any>
	trans?: Record<
		string,
		<Input extends IOpstream, Output extends IOpstream>(input: Input) => Output
	>
	protocols?: Record<string, Protocol>
	vibes?: Record<string, {new (surface: Surface<any>): Vibe} | ((surf) => Vibe)>
	views?: Record<
		string,
		| {new (surface: Surface<any>): View<any>}
		| ((surface: Surface<any>) => View<any>)
	>
}

export interface Packages extends Record<string, Package> {}

export const packages = {} as Packages

export function registerPackage<P extends Package>(pkg: P): P {
	// todo deep reactivity on these guys
	// in some way or other
	// of course the graph needs to live outside this world
	// it must be aware of the text
	// that is to say, if i do `var x = atom(10)`
	// and then later i do `var x = atom(10)`
	// that is the same var. and so is `var x = atom(2)`, that's
	// the same var with a new value. because its name and owner
	// is the same (more realistically, registerPackage({settings: {a}}) twice)
	packages[pkg.name] = pkg
	return pkg
}

queueMicrotask(async () => {
	window.lb = await import(`${"littlebook"}`)
	const dockPath = "/littlebook:system/packages/dock/dock.ts"
	await import(dockPath)
	const textEditorPath = "/littlebook:system/packages/text/text-editor.ts"
	await import(textEditorPath)
	const userScript = "/littlebook:user/init.ts"
	await import(userScript).catch(error => {
		console.error(`Failed to load user script "${userScript}":`, error)
	})
})

// todo should this be a url?
// rot13+file:// or something?
const rot13 = (str: string) =>
	str.replace(/[a-zA-Z]/g, c =>
		String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < "n" ? 13 : -13))
	)

const transrot13 = (opstream: OpstreamText): IOpstreamText => {
	return {
		parent: opstream,
		get value() {
			return rot13(opstream.value)
		},
		connect(callback: (op: TextOp) => void) {
			return opstream.connect(op => {
				callback({
					...op,
					content: op.content && rot13(op.content),
				})
			})
		},
		apply(op: TextOp) {
			opstream.apply({
				...op,
				content: op.content && rot13(op.content),
			})
		},
	}
}

window.transrot13 = transrot13

/* const source = await protocols["file:"](
	"file:///Users/chee/soft/chee/lb/littlebook/system/littlebook.ts"
)

const text = source.text()
const rot13text = rot13textstream(text)
text.sub(op => {
	console.log("text op:", op)
})

rot13text.sub(op => {
	console.log("rot13 op:", op)
})

text.mut({
	type: "insert",
	pos: 0,
	content: "chee",
	agent: "test-agent",
})

window.t = text
window.r = rot13text
 */
