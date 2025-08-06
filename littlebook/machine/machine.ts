import * as COMLINK from "comlink"
import mimetypes, {mime} from "../machine/mimes.ts"
import {createEsbuild, transformWithEsbuild} from "./esbuild.ts"
import setupServiceWorker from "./setup-service-worker.ts"
import read from "./transform/read.ts"
import resolve from "./transform/resolve.ts"
import type {TypescriptWorker} from "./typescript-worker.ts"

const typescriptWorker = COMLINK.wrap<TypescriptWorker>(
	new Worker("./typescript-worker.js", {type: "module"})
)

const esbuild = await createEsbuild()

export interface LbMachinePluginMessage {
	text: string
	pluginName?: string
	location?: {
		url: string
		line?: number
		column?: number
		length?: number
		lineText?: string
	}
}

export interface LbMachinePluginHookOptions {
	filter: RegExp
}

type Headersish = Record<string, string>

export interface OnResolveArgs {
	url: string
	method: string
	destination: RequestDestination
	referrer: string
	requestHeaders: Headersish
}

export interface OnResolveResult {
	url: string

	responseHeaders?: Headersish
	warnings?: LbMachinePluginMessage[]
	errors?: LbMachinePluginMessage[]
}

export interface OnReadArgs {
	url: string
	method: string
	destination: RequestDestination
	referrer: string
	requestHeaders: Headersish
	responseHeaders: Headersish
}

export interface OnReadResult {
	contents: string | Uint8Array

	responseHeaders?: Headersish
	warnings?: LbMachinePluginMessage[]
	errors?: LbMachinePluginMessage[]
}

export interface OnTransformArgs {
	url: string
	contents: string | Uint8Array

	method: string
	destination: RequestDestination
	referrer: string

	requestHeaders: Headersish
	responseHeaders: Headersish
}

export interface OnTransformResult {
	contents: string | Uint8Array

	responseHeaders?: Record<string, string>
	warnings?: LbMachinePluginMessage[]
	errors?: LbMachinePluginMessage[]
}

type VeryNullable<T> = T | null | undefined | void
type MaybePromise<T> = T | Promise<T>
type FastAndLoose<T> = MaybePromise<VeryNullable<T>>

type OnResolveCallback = (args: OnResolveArgs) => FastAndLoose<OnResolveResult>

type OnResolve = (
	options: LbMachinePluginHookOptions,
	callback: OnResolveCallback
) => void

type OnReadCallback = (args: OnReadArgs) => FastAndLoose<OnReadResult>

type OnRead = (
	options: LbMachinePluginHookOptions,
	callback: OnReadCallback
) => void

type OnTransformCallback = (
	args: OnTransformArgs
) => FastAndLoose<OnTransformResult>

type OnTransform = (
	options: LbMachinePluginHookOptions,
	callback: OnTransformCallback
) => void

export interface LbMachinePluginContext {
	machine: LbPrivate["machine"]
	importmap: LbPrivate["importmap"]
	onResolve: OnResolve
	onRead: OnRead
	onTransform: OnTransform
}

export interface LbMachinePlugin {
	name: string
	setup(context: LbMachinePluginContext): void
}

declare global {
	interface LbPrivate {
		machine: {
			typescript: {
				worker: typeof typescriptWorker
			}
			esbuild: typeof esbuild
			transformWithEsbuild: typeof transformWithEsbuild
			mime: typeof mime
			mimetypes: typeof mimetypes
			resolve: typeof resolve
			read: typeof read
			plugins: LbMachinePlugin[]
		}
	}
}

window.__lb.machine = {
	typescript: {
		worker: typescriptWorker,
	},
	esbuild,
	transformWithEsbuild,
	mime,
	mimetypes,
	resolve,
	read,
	plugins: [],
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const js = String.raw

function csswrap(url: string, code: string) {
	return js`
		const style = ${JSON.stringify(code)}
		const existing = document.querySelector("style[data-littlebook-css='${url}']")
		const element = existing ?? document.createElement("style")
		element.dataset.littlebookCss = ${JSON.stringify(url)}
		element.textContent = style
		export default style
		document.head.appendChild(element)
	`
}

function preparePlugins(url: string) {
	return __lb.machine.plugins.map(plugin => {
		const resolvers: OnResolveCallback[] = []
		const readers: OnReadCallback[] = []
		const transformers: OnTransformCallback[] = []
		plugin.setup({
			machine: __lb.machine,
			importmap: __lb.importmap,
			onResolve(opts, callback) {
				if (opts.filter.test(url)) resolvers.push(callback)
			},
			onRead(opts, callback) {
				if (opts.filter.test(url)) readers.push(callback)
			},
			onTransform(opts, callback) {
				if (opts.filter.test(url)) transformers.push(callback)
			},
		})
		return {name: plugin.name, resolvers, readers, transformers}
	})
}

function esbuildMessageToLbMessage(
	message: import("esbuild").Message
): LbMachinePluginMessage {
	return {
		text: message.text,
		location: {
			...message.location,
			url: message.location?.file ?? "",
		},
		pluginName: message.pluginName,
	}
}

async function transform(
	url: string,
	requestish: Requestish
): Promise<Responsish> {
	let path: string | undefined
	const warnings: LbMachinePluginMessage[] = []
	const errors: LbMachinePluginMessage[] = []
	const plugins = preparePlugins(url)
	const responseHeaders: Record<string, string> = {}

	const resolvers = plugins.reduce(
		(resolvers, plugin) => [...resolvers, ...plugin.resolvers],
		[] as OnResolveCallback[]
	)

	for (const resolver of resolvers) {
		const result = await resolver({
			url,
			method: requestish.method,
			destination: requestish.destination,
			referrer: requestish.referrer,
			requestHeaders: requestish.headers,
		})
		if (result) {
			path = result.url
			Object.assign(responseHeaders, result.responseHeaders)
			// todo add pluginName?
			warnings.push(...(result.warnings ?? []))
			errors.push(...(result.errors ?? []))
			break
		}
	}

	if (!path) {
		path = resolve(url).toString()
	}

	const readers = plugins.reduce(
		(readers, plugin) => [...readers, ...plugin.readers],
		[] as OnReadCallback[]
	)

	let rawCode: string | Uint8Array | undefined
	for (const reader of readers) {
		const result = await reader({
			url,
			method: requestish.method,
			destination: requestish.destination,
			referrer: requestish.referrer,
			requestHeaders: requestish.headers,
			responseHeaders,
		})
		if (result) {
			rawCode = result.contents
			Object.assign(responseHeaders, result.responseHeaders)
			warnings.push(...(result.warnings ?? []))
			errors.push(...(result.errors ?? []))
			break
		}
	}

	if (!rawCode) {
		rawCode = await read(path)
	}

	const transformers = plugins.reduce(
		(transformers, plugin) => [...transformers, ...plugin.transformers],
		[] as OnTransformCallback[]
	)

	let code: string | Uint8Array | undefined
	for (const transformer of transformers) {
		const result = await transformer({
			url,
			method: requestish.method,
			destination: requestish.destination,
			referrer: requestish.referrer,
			requestHeaders: requestish.headers,
			responseHeaders,
			contents: rawCode,
		})
		if (result) {
			code = result.contents
			Object.assign(responseHeaders, result.responseHeaders)
			warnings.push(...(result.warnings ?? []))
			errors.push(...(result.errors ?? []))
			break
		}
	}

	if (!code) {
		const result = await transformWithEsbuild(esbuild, url, rawCode, {})
		warnings.push(...result.warnings.map(esbuildMessageToLbMessage))
		code = result.code
	}

	warnings.forEach(warning => {
		console.warn(`esbuild warning: ${warning.text}`)
	})

	// todo this should maybe be stuck in a default plugin
	let contentType = responseHeaders["content-type"] || mime(url)

	if (contentType == "application/javascript") {
		typescriptWorker.createFile(url, code)
	}

	// todo this should maybe be stuck in a default plugin
	if (contentType == "text/css" && requestish.destination == "script") {
		contentType = "application/javascript"

		code = csswrap(url, typeof code == "string" ? code : decoder.decode(code))
	}

	// todo this should maybe be stuck in a default plugin
	if (contentType == "application/json" && requestish.destination == "script") {
		contentType = "application/javascript"
	}

	responseHeaders["content-type"] = contentType

	const codeBytes = typeof code == "string" ? encoder.encode(code) : code

	return {
		type: "response",
		body: codeBytes,
		headers: responseHeaders,
		status: 200,
	}
}

async function setup() {
	try {
		await setupServiceWorker(transform)
	} catch (error) {
		console.error(error)
		setbg("#ff2a50")
		throw error
	}
}

await setup()

// todo configurable entrypoint for boots
// todo should i add this to a script tag instead
//
const entry = "/littlebook:system/littlebook.ts"
performance.mark("system->start")
const script = document.createElement("script")
script.onload = function () {
	performance.mark("system->end")
	const systemMeasure = performance.measure(
		"system",
		"system->start",
		"system->end"
	)
	console.debug(
		`%cLittlebook.System loaded in %c${systemMeasure.duration.toFixed(2)}ms`,
		"font-weight: bold; color: #3c9;",
		"font-weight: bold; color: #000;"
	)
}
script.type = "module"
script.src = entry
document.head.appendChild(script)

function setbg(color: string) {
	Object.assign(document.head.querySelector("style")!, {
		textContent: `html{background:${color}}`,
	})
}
