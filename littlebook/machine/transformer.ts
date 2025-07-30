import esbuild, {type TransformOptions} from "esbuild-wasm"
import {mime} from "./mimes.ts"
import * as Comlink from "comlink"
import type {TypescriptWorker} from "./typescript-worker.ts"

const js = String.raw

const typescriptWorker = Comlink.wrap<TypescriptWorker>(
	new Worker("./typescript-worker.js", {
		type: "module",
	})
)

window.__lb_typescriptWorker = typescriptWorker
declare global {
	var __lb_typescriptWorker: typeof typescriptWorker
}

const encoder = new TextEncoder()
navigator.serviceWorker.addEventListener("message", async event => {
	if (event.data.type == "request") {
		const {id, options} = event.data

		// todo make this more userlandable
		try {
			const url = resolvePath(event.data.url)
			const bytes = await readURL(url)
			const result = await transform(url, bytes, {})
			result.warnings.forEach(warning => {
				console.warn(`esbuild warning: ${warning.text}`)
			})
			let contentType = mime(url.pathname)
			if (contentType == "application/javascript") {
				typescriptWorker.createFile(
					event.data.url,
					Comlink.transfer(bytes, [bytes.buffer])
				)
			}
			let code = result.code
			if (contentType == "text/css" && options.destination == "script") {
				contentType = "application/javascript"
				code = js`
					const style = ${JSON.stringify(result.code)}
					const existing = document.querySelector("style[data-littlebook-css='${
						url.pathname
					}']")
					const element = existing ?? document.createElement("style")
					element.dataset.littlebookCss = ${JSON.stringify(url.pathname)}
					element.textContent = style
					export default style
					document.head.appendChild(element)
				`
			}

			if (
				contentType == "application/json" &&
				options.destination == "script"
			) {
				contentType = "application/javascript"
			}

			const codeBytes = encoder.encode(code)

			event.source.postMessage(
				{
					type: "response",
					id,
					body: codeBytes,
					init: {
						headers: {"content-type": contentType},
						status: 200,
					},
				},
				{transfer: [codeBytes.buffer]}
			)
		} catch (cause) {
			const error = cause instanceof Error ? cause : new Error(String(cause))

			event.source.postMessage({
				type: "response",
				id,
				body: error.message,
				init: {
					url: event.data.url.toString().slice(1),
					headers: {},
					status: error.message.toString().toLowerCase().includes("not found")
						? 404
						: 500,
				},
			})
		}
	}
})

function ensureTrailingSlash(path: string): string {
	if (path.endsWith("/")) return path
	return `${path}/`
}

const esbuildInitialized = Promise.withResolvers<void>()

await esbuild
	.initialize({wasmURL: "/esbuild.wasm", worker: false})
	.then(() => esbuildInitialized.resolve())

const existingSw = await navigator.serviceWorker.getRegistration()

navigator.serviceWorker.addEventListener("controllerchange", function () {
	console.log(
		"%cNew service worker activated, reloading",
		"color: pink; font-weight: bold"
	)
	location.reload()
})

const nativeEnv = window.__lb_native_env

const extmap = {
	mjs: "js",
	cjs: "js",
	cts: "ts",
	mts: "ts",
}

function resolvePath(path: string, base?: string | URL): URL {
	const {imports} = window.__lb_importmap

	if (imports[path]) {
		path = imports[path]
	}

	const lbfsMatch = path.match(/^(littlebook):(.*)/)
	if (lbfsMatch) {
		;[, , path] = lbfsMatch
		const systemMatch = path.match(/^\/?system\/(.*)/)
		const userMatch = path.match(/^\/?user\/(.*)/)
		if (systemMatch) {
			const sys = ensureTrailingSlash(nativeEnv.systemDirectory.toString())
			path = `${sys}${systemMatch[1]}`
		} else if (userMatch) {
			const home = ensureTrailingSlash(nativeEnv.userDirectory.toString())
			path = `${home}${userMatch[1]}`
		}
	}

	return new URL(path, base)
}

// todo streaming?
async function readURL(url: URL) {
	let bytes: Uint8Array
	const protocolName = url.protocol.slice(0, -1)

	const source = window.__lb_protocols && window.__lb_protocols[url.protocol]
	if (source) {
		try {
			const handle = await source(url)
			return handle.bytes()
		} catch (cause) {
			throw new Error(cause, {cause})
		}
	}

	if (!bytes) {
		if (protocolName in __lb_env) {
			try {
				bytes = await __lb_env[protocolName].read(url.toString())
			} catch (cause) {
				// todo return a 404, or 400, or 500
				throw new Error(cause, {cause})
			}
		}
	}

	// todo this should be handled in the service worker
	if (!bytes && protocolName.match(/^https?$/)) {
		const response = await fetch(url.toString())
		if (response.ok) {
			try {
				bytes = new Uint8Array(await response.arrayBuffer())
			} catch (cause) {
				// todo return a 404, or 400, or 500
				throw new Error(cause, {cause})
			}
		}
	}

	if (!bytes) {
		console.error(
			`Failed to read file at ${url.toString()}. No handler found for protocol "${protocolName}:".`
		)
		throw new Error(`protocol handler not found for ${url}`)
	}

	return bytes
}

async function transform(
	url: URL,
	input: string | Uint8Array,
	options?: TransformOptions
) {
	const ext = url.pathname.split(".").pop()

	return await esbuild.transform(input, {
		loader: extmap[ext] || ext,
		sourcemap: "inline",
		platform: "browser",
		format: "esm",
		sourcefile: url.toString(),
		target: "esnext",
		logLevel: "debug",
		logOverride: {
			"unsupported-dynamic-import": "silent",
		},
		...options,
	})
}

try {
	await navigator.serviceWorker
		.register("/service-worker.js")
		.then(async () => {
			if (!existingSw?.active) {
				location.reload()
				return
			}
			console.log(
				"Service worker registered, loading %cLittlebook.%cSystem!",
				"font-weight: bold; color: #3c9;",
				"font-weight: bold; color: #000;"
			)

			const entry = "/littlebook:system/littlebook.ts"
			performance.mark("system->start")
			await import(entry)
			performance.mark("system->end")
			const systemMeasure = performance.measure(
				"system",
				"system->start",
				"system->end"
			)
			console.debug(
				`%cLittlebook.System loaded in %c${systemMeasure.duration.toFixed(
					2
				)}ms`,
				"font-weight: bold; color: #3c9;",
				"font-weight: bold; color: #000;"
			)
		})
} catch (error) {
	console.error(error)
	setbg("red")
	throw error
}

function setbg(color: string) {
	Object.assign(document.head.querySelector("style"), {
		textContent: `html{background:${color}}`,
	})
}
