import type {LbEnvironment} from "../bookstrap/bookstrap.ts"
const debugSetting =
	localStorage.getItem("debug") ?? localStorage.getItem("DEBUG") ?? ""
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

declare global {
	interface Window {
		__lb_native_env: LbEnvironment
	}
}

/**
 * Install Littlebook onto the user's system.
 */
async function install() {
	await window.__lb_native_env.install()
}

function setbg(color: string) {
	Object.assign(document.head.querySelector("style"), {
		textContent: `html{background:${color}}`,
	})
}

async function setup() {
	performance.mark("bookstrap->end")
	performance.mark("setup->start")
	const textDecoder = new TextDecoder("utf-8")
	// todo let the user choose
	window.__lb_native_env = window.__TAURI__
		? window.__lb_env.taurifs
		: window.__lb_env.opfs

	const nativeEnv = window.__lb_native_env

	setbg("#f9fcff")
	performance.mark("install->start")
	if (localStorage.getItem("lb_install") == "never") {
		debug("not installing: user said NEVER")
	} else {
		if (localStorage.getItem("lb_install") == "always") {
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
	performance.mark("install->end")
	performance.mark("importmap->start")
	setbg("#f0fffc")
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
	performance.mark("importmap->end")
	setbg("#fffafa")
	performance.mark("early-init->start")
	const earlyInitLocation = new URL("early-init.js", nativeEnv.userDirectory)
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
	} catch {}

	setbg("#fffffa")
	performance.mark("early-init->end")
	debug("complete")
	performance.mark("setup->end")
	if (IS_DEBUGGING) {
		const bookstrapMeasure = performance.measure(
			"bookstrap",
			"bookstrap->start",
			"bookstrap->end"
		)
		const installMeasure = performance.measure(
			"install",
			"install->start",
			"install->end"
		)
		const importmapMeasure = performance.measure(
			"importmap",
			"importmap->start",
			"importmap->end"
		)
		const earlyInitMeasure = performance.measure(
			"early-init",
			"early-init->start",
			"early-init->end"
		)
		const setupMeasure = performance.measure(
			"setup",
			"setup->start",
			"setup->end"
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

	const importmap = Object.assign(document.createElement("script"), {
		type: "importmap",
		textContent: JSON.stringify(window.__lb_importmap, null, 2),
	})

	document.head.append(importmap)

	const script = document.createElement("script")
	script.type = "module"
	script.src = "/transformer.js"
	document.head.append(script)
}
