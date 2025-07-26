self.__lb_error_context = null
function ensureTrailingSlash(path: string): string {
	if (path.endsWith("/")) return path
	return `${path}/`
}

const existingSw = await navigator.serviceWorker.getRegistration()

navigator.serviceWorker.addEventListener("controllerchange", function () {
	console.log("New service worker activated, reloading")
	location.reload()
})

const nativeEnv = window.__lb_native_env

navigator.serviceWorker.addEventListener("message", async event => {
	if (event.data.type == "read") {
		let path = event.data.path
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
				path = `${ensureTrailingSlash(nativeEnv.systemDirectory.toString())}${
					systemMatch[1]
				}`
			} else if (userMatch) {
				path = `${ensureTrailingSlash(nativeEnv.userDirectory.toString())}${
					userMatch[1]
				}`
			}
		}

		const url = new URL(path)
		let bytes: Uint8Array
		const protocolName = url.protocol.slice(0, -1)
		const handler = window.lb && window.lb.protocol.get(`${protocolName}:`)
		if (handler) {
			const handle = await handler(url)
			if (handle && "bytes" in handle) {
				try {
					bytes = await handle.bytes()
				} catch (error) {
					throw new Error(error, {
						cause: __lb_error_context,
					})
				}
			}
		}

		if (!bytes) {
			if (protocolName in __lb_env) {
				try {
					bytes = await __lb_env[protocolName].read(url.toString())
				} catch (error) {
					throw new Error(error, {
						cause: __lb_error_context,
					})
				}
			}
		}

		if (!bytes && protocolName.match(/^https?$/)) {
			const response = await fetch(url.toString())
			if (response.ok) {
				bytes = new Uint8Array(await response.arrayBuffer())
			}
		}

		if (!bytes) {
			console.error(
				`Failed to read file at ${url.toString()}. No handler found for protocol "${protocolName}:".`
			)
			return
		}

		event.source.postMessage(
			{type: "read", id: event.data.id, bytes},
			{transfer: [bytes.buffer]}
		)
	}
})

try {
	await navigator.serviceWorker.register("/serviceworker.js").then(async () => {
		if (!existingSw?.active) {
			location.reload()
			return
		}
		console.log(
			"Service worker registered, loading %cLittlebook.%cSystem",
			"font-weight: bold; color: #3c9;",
			"font-weight: bold; color: #000;"
		)

		const entry = "/littlebook:system/entrypoint.ts"
		performance.mark("system->start")
		await import(entry)
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
