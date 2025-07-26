import type {LbEnvironment} from "../bookstrap/bookstrap.ts"
const debugSetting = localStorage.getItem("debug") ?? ""
const IS_DEBUGGING = debugSetting.match(/(lb|littlebook)?\*/)

const debug = IS_DEBUGGING
	? console.debug.bind(
			console,
			"%clittlebook:install",
			"color: #ff79c6; font-weight: bold;"
	  )
	: () => {}

if (Object.keys(window.__lb_env).length == 0) {
	window.addEventListener("__lb_env", setup, {once: true})
} else {
	setup()
}

function ensureTrailingSlash(path: string): string {
	if (path.endsWith("/")) return path
	return `${path}/`
}

declare global {
	interface Window {
		__lb_native_env: LbEnvironment
	}
}

/**
 * Install Littlebook onto the user's system.
 */
async function install() {
	return await window.__lb_native_env.install()
}

function setbg(color: string) {
	Object.assign(document.head.querySelector("style"), {
		textContent: `html{background:${color}}`,
	})
}

async function setup() {
	// todo let the user choose
	window.__lb_native_env = window.__TAURI__
		? window.__lb_env.taurifs
		: window.__lb_env.opfs

	const nativeEnv = window.__lb_native_env
	performance.mark("bookstrap:end")
	await __lb_withContext("install:setup", async () => {
		const textDecoder = new TextDecoder("utf-8")

		setbg("#f9fcff")

		await __lb_withContext("install", async () => {
			const setting = localStorage.getItem("lb_install")?.toLowerCase() ?? ""
			if (setting == "never") {
				debug("not installing: user said localStrage.lb_install NEVER")
			} else {
				if (setting == "always") {
					debug("installing: forced by localStorage.lb_install == always")
					await install()
				} else {
					const versionFileURL = new URL("zversion", nativeEnv.systemDirectory)
					let versionFile: Uint8Array

					try {
						versionFile = await nativeEnv.read(versionFileURL.toString())
					} catch {}
					if (!versionFile) {
						debug("installing: no version file")
						await install()
					} else {
						// todo probably publish the version file on its own
						const vfs = await (await fetch("/system.json")).json()
						const installedVersion = textDecoder.decode(versionFile)
						const latestVersion = vfs.files.zversion.content
						if (installedVersion !== latestVersion) {
							debug("installing: outdated")
							await install()
						}
					}
				}
			}
		})
		setbg("#f0fffc")

		await __lb_withContext("importmap", async () => {
			const importmaps: (typeof window.__lb_importmap)[] = []
			const importmapLocations = [
				new URL("importmap.json", nativeEnv.systemDirectory),
				new URL("importmap.json", nativeEnv.userDirectory),
			]
			for (const location of importmapLocations) {
				try {
					const importmap = await nativeEnv.read(location.toString())
					if (importmap) {
						importmaps.push(JSON.parse(textDecoder.decode(importmap)))
					}
				} catch {}
			}

			if (importmaps.length > 0) {
				debug("merging importmaps")
				const maps = importmaps.reduce(
					(acc, map) => {
						for (const [key, value] of Object.entries(map.imports || {})) {
							if (acc.imports[key] && acc.imports[key] !== value) {
								console.warn(
									`Duplicate import map entry for "${key}": "${acc.imports[key]}" and
"${value}". Using "${value}".`
								)
							}
							acc.imports[key] = value
						}
						for (const [key, value] of Object.entries(map.scopes || {})) {
							if (acc.scopes[key] && acc.scopes[key] !== value) {
								console.warn(
									`Duplicate import map scope for "${key}": "${acc.scopes[key]}" and
"${value}". Using "${value}".`
								)
							}
							acc.scopes[key] = value
						}
						return acc
					},
					{imports: {}, scopes: {}}
				)

				window.__lb_importmap = maps
			}
		})

		setbg("#fffafa")
		await __lb_withContext("early-init", async () => {
			const earlyInitLocation = new URL(
				"early-init.js",
				nativeEnv.userDirectory
			)
			try {
				const earlyInit = await nativeEnv.read(earlyInitLocation.toString())
				if (earlyInit) {
					debug("loading user early-init")
					const script = document.createElement("script")
					script.src = URL.createObjectURL(
						new Blob([earlyInit], {type: "text/javascript"})
					)
					const {promise, resolve} = Promise.withResolvers<void>()
					script.onload = () => resolve()
					document.head.appendChild(script)
					await promise
					setTimeout(() => {
						console.warn(
							"user early init took too long to load so i'm just carrying on, sorry"
						)
						resolve()
					}, 1000)
				}
			} catch (error) {
				console.warn(
					`Failed to load user early-init script at ${earlyInitLocation.toString()}:`,
					error
				)
			}
		})

		// IMPORTANT after early init so they can do stuff with __lb_importmap in there
		const importmap = Object.assign(document.createElement("script"), {
			type: "importmap",
			textContent: JSON.stringify(window.__lb_importmap, null, 2),
		})

		document.head.append(importmap)

		await __lb_withContext("serviceworker", async () => {
			await setupServiceWorker(nativeEnv)
		})
	})

	log()
}

async function setupServiceWorker(env: LbEnvironment) {
	const existingSw = await navigator.serviceWorker.getRegistration()

	navigator.serviceWorker.addEventListener("controllerchange", function () {
		console.log("New service worker activated, reloading")
		location.reload()
	})

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
					path = `${ensureTrailingSlash(env.systemDirectory.toString())}${
						systemMatch[1]
					}`
				} else if (userMatch) {
					path = `${ensureTrailingSlash(env.userDirectory.toString())}${
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
						console.error("woops", __lb_context.stack)
					}
				}
			}

			if (!bytes) {
				if (protocolName in __lb_env) {
					try {
						bytes = await __lb_env[protocolName].read(url.toString())
					} catch (error) {
						console.error("woops")
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
		await navigator.serviceWorker
			.register("/service-worker.js")
			.then(async () => {
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

				await __lb_withContext("loadsystem", async context => {
					await import(entry).catch(error => {
						console.error(
							`Failed to load Littlebook.System entrypoint at ${entry}:`,
							error,
							context.stack
						)
					})
				})

				const systemMeasure = performance.measure(
					"loadsystem",
					"loadsystem->start",
					"loadsystem->end"
				)

				console.debug(
					`%cLittlebook.System loaded in %c${systemMeasure.duration.toFixed(
						2
					)}ms`,
					"font-weight: bold; color: #3c9;",
					"font-weight: bold; color: #000;"
				)
				debug("system loaded")
			})
	} catch (error) {
		console.error(error)
		setbg("#ffcccc")
		throw error
	}
}

function log() {
	if (!IS_DEBUGGING) return
	const bookstrapMeasure = performance.measure(
		"bookstrap",
		"bookstrap:start",
		"bookstrap:end"
	)
	const installMeasure = performance.measure(
		"install:setup:install",
		"install:setup:install->start",
		"install:setup:install->end"
	)
	const importmapMeasure = performance.measure(
		"install:setup:importmap",
		"install:setup:importmap->start",
		"install:setup:importmap->end"
	)
	const earlyInitMeasure = performance.measure(
		"install:setup:early-init",
		"install:setup:early-init->start",
		"install:setup:early-init->end"
	)
	const setupMeasure = performance.measure(
		"install:setup",
		"install:setup->start",
		"install:setup->end"
	)
	console.debug(
		`%cLittlebook ${window.__TAURI__ ? "Desktop" : "Web"}
  %cbookstrap: %c${bookstrapMeasure.duration.toFixed(2)}ms
  %cinstall: %c${installMeasure.duration.toFixed(2)}ms
  %cimportmap: %c${importmapMeasure.duration.toFixed(2)}ms
  %cearly-init: %c${earlyInitMeasure.duration.toFixed(2)}ms
  %ctotal setup time: %c${setupMeasure.duration.toFixed(2)}ms`,
		"font-weight: bold; color: #3c9; font-size: 1.2rem;",
		"font-weight: light; color: #333; font-size: 1.0rem",
		"font-weight: bold; color: #000; font-size: 1.0rem",
		"font-weight: light; color: #333; font-size: 1.0rem",
		"font-weight: bold; color: #000; font-size: 1.0rem",
		"font-weight: light; color: #333; font-size: 1.0rem",
		"font-weight: bold; color: #000; font-size: 1.0rem",
		"font-weight: light; color: #333; font-size: 1.0rem",
		"font-weight: bold; color: #000; font-size: 1.0rem",
		"font-weight: light; color: #333; font-size: 1.0rem",
		"font-weight: bold; color: #000; font-size: 1.0rem"
	)
}
