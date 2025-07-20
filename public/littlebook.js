import dottie from "./vendor/dottie.js"
import debug from "./vendor/debug.js"
import {getFunctionInfo} from "./reflection/reflection.js"
import parseStack from "./reflection/stack.js"
const logger = debug("littlebook")
console.log("hello")

/**
 * @template K
 * @template T
 * @type {Map<K, T> & {label: string}}
 */
class WarningMap extends Map {
	/**
	 * @param {string} label
	 */
	constructor(label) {
		super()
		this.label = label
	}

	/**
	 * @param {K} key
	 * @param {T} value
	 */
	set(key, value) {
		if (this.has(key)) {
			console.warn(`overwriting ${this.label}: "${key}"`)
		}
		return super.set(key, value)
	}
}

function addToList(list, item) {
	const index = list.indexOf(item)
	if (index != -1) {
		;[list[index], list[0]] = [list[0], list[index]]
	} else {
		list.unshift(item)
	}
}

function removeFromList(list, item) {
	const index = list.indexOf(item)
	if (index > -1) {
		list[index] = list[list.length - 1]
		list.pop()
	}
}

/**
 * @param {WarningMap} map
 * @param {string} [query]
 */
function createMatchmaker(map, query) {
	return {
		/**
		 * @type {Array<[RegExp, string]>}
		 */
		patterns: [],
		/**
		 *
		 * @param {[RegExp, string]} pattern
		 */
		addPattern(pattern) {
			addToList(this.patterns, pattern)
		},
		/**
		 *
		 * @param {[RegExp, string]} pattern
		 */
		removePattern(pattern) {
			removeFromList(this.patterns, pattern)
		},
		/**
		 *
		 * @param {URL|string} url
		 * @param {string} [defaultTo]
		 * @returns
		 */
		matchName(url, defaultTo) {
			if (typeof url != "string") {
				if (query && url.searchParams?.has(query)) {
					url = url.searchParams?.get(query) ?? defaultTo
				}
				url = url.toString()
			}
			const match = this.patterns.find(([regexp]) => {
				return regexp.exec(url)
			})
			return match?.[1] ?? defaultTo
		},
		match(url, defaultTo) {
			const name = this.matchName(url, defaultTo)
			if (!name) {
				throw new Error(`no ${map.label} for ${url}`)
			}
			return map.get(name)
		},
	}
}

// todo consider making the set/get stuff simpler/better/harder/faster by having a (optional) namespace
// so there are only two layers. get("dock", "default-thing") is dock["default-thing"]
// and set("dock", "default-thing", value) is sets default-thing to be a read-only value
// and if you leave the namespace empty it uses global namespace get("some-thing")
// todo make this an interface so that it can be extended
export default class Littlebook extends EventTarget {
	areas = {}
	/**
	 *
	 * @param {{environmentVariables?: Record<string, string>, workingDirectory?: URL}} options
	 */
	constructor(options) {
		super()
		this.environmentVariables = options.environmentVariables ?? {}
		this.workingDirectory =
			options.workingDirectory ?? new URL(".", import.meta.url)
		this.style(import.meta.resolve("./styles/littlebook.css"))
		this.areas.main = document.createElement("e-d-i-t")
		this.areas.main.setAttribute("role", "main")
		this.areas.echo = document.createElement("e-c-h-o")
		this.areas.echo.setAttribute("role", "status")
		this.areas.echo.setAttribute("aria-live", "polite")
		document.body.append(this.areas.main, this.areas.echo)

		try {
			const lb = this
			globalThis.lb = lb
			globalThis.littlebook = lb
			globalThis.setenv = lb.setenv.bind(lb)
			globalThis.getenv = lb.getenv.bind(lb)
			globalThis.defvar = lb.defineSetting.bind(lb)
			globalThis.defcmd = lb.defineCommand.bind(lb)
			globalThis.call = lb.call.bind(lb)
			globalThis.getcmd = lb.getcmd.bind(lb)
			globalThis.set = lb.set.bind(lb)
			globalThis.get = lb.get.bind(lb)
			globalThis.changeDirectory = lb.changeDirectory.bind(lb)
		} catch (error) {
			console.error(error)
		}
	}

	/** @type {LittlebookSurface} */
	surface = null
	/** @type {Record<string, LittlebookSurface>} */
	surfaces = {}
	logger = logger
	surfaceLayer = null
	surfaceLayers = new WarningMap("surface layer")
	views = new WarningMap("view")
	associations = createMatchmaker(this.views)

	// todo view is now a terrible name for this concept. it populates a surface
	/**
	 *
	 * @param {string} name
	 * @param {function(LittlebookSurface):LittlebookSurface&{element: HTMLElement}} view
	 */
	registerView(name, view) {
		this.views.set(name, view)
	}

	/**
	 *
	 * @param {RegExp | [RegExp, string]} pattern
	 * @param {string} view
	 */
	associate(pattern, view) {
		if (typeof pattern == "string") {
			this.associations.addPattern([pattern, view])
		} else {
			this.associations.addPattern(/** @type {[RegExp, string]} */ (pattern))
		}
		return pattern
	}

	/**
	 * @param {string} name
	 * @param {function(HTMLElement): LittlebookSurfaceLayer} callback
	 */
	registerSurfaceLayer(name, callback) {
		const elementName = name.replace(/./g, $ => $ + "-").slice(0, -1)
		if (this.surfaceLayers.has(name)) {
			document.querySelector(elementName)?.remove()
		}
		const el = document.createElement(elementName)
		const layer = callback(el)
		if (!this.surfaceLayer) {
			this.surfaceLayer = layer
		}
		this.surfaceLayers.set(name, layer)
		this.areas.main.append(el)
	}

	focus(id) {
		this.surfaces[id]?.layer?.focus(id)
		this.surfaces[id]?.focus?.()
		this.dispatchEvent(new CustomEvent("lb:focused", {detail: id}))
	}

	/**
	 * @param {URL} url
	 * @param {object} [options]
	 * @param {string} [options.id]
	 * @param {boolean} [options.focus]
	 * @param {string} [options.layer]
	 */
	async open(url, options = {}) {
		if (typeof url == "string") {
			url = new URL(url, this.workingDirectory)
		}
		const id = Math.random().toString(36).slice(2)
		const parts = url.pathname.split("/")
		const name = parts[parts.length - 1]
		const surface = /** @type {LittlebookSurface} */ ({
			id,
			url,
			name,
			modes: [],
			meta: {},
		})
		const layerName = options.layer ?? this.surfaceLayer?.name
		const layer = this.surfaceLayers.get(layerName) ?? this.surfaceLayer
		surface.layer = layer
		const viewName = this.associations.matchName(url)
		if (!viewName) {
			throw new Error(`no view registered for ${url}`)
		}
		const view = this.views.get(viewName)
		if (!view) {
			throw new Error(
				`"${viewName}" registered for ${url} but no view "${viewName}" found`
			)
		}
		await view(surface)
		layer?.place(surface)
		if (!layer) {
			console.warn("no surface layer found, using main area")
			this.areas.main.append(surface.element)
		}
		this.dispatchEvent(
			new CustomEvent("lb:opened", {detail: {url, options, id, layer}})
		)
	}

	/**
	 * @param {URL} url
	 * @returns {void}
	 */
	changeDirectory(url) {
		this.workingDirectory = url
		this.dispatchEvent(new CustomEvent("lb:change-directory", {detail: url}))
	}

	/**
	 * @param {string} name
	 * @returns {any}
	 */
	getenv(name) {
		return this.environmentVariables[name]
	}

	/**
	 * @param {string} name
	 * @param {string} value
	 * @returns {void}
	 */
	setenv(name, value) {
		this.environmentVariables[name] = value
		this.dispatchEvent(new CustomEvent(`lb:env:${name}`, {detail: value}))
	}

	cmd = {}
	var = {}

	/**
	 * @param {string|URL} path
	 */
	style(path) {
		const link = document.createElement("link")
		link.rel = "stylesheet"
		link.href = path.toString()
		document.head.appendChild(link)
	}

	/**
	 * @param {string} name
	 * @param {function} command
	 */
	defineCommand(name, command) {
		if (dottie.exists(this.cmd, name)) {
			console.warn(`overwriting command: "${name}"`)
		}
		const info = getFunctionInfo(command, new Error().stack)

		dottie.set(
			this.cmd,
			name,
			{...info, call: command},
			{readonly: true, force: true}
		)
		this.dispatchEvent(new CustomEvent(`lb:defcmd:${name}`, {detail: info}))
	}

	/**
	 * @param {string} name
	 * @param {function} initialValue
	 * @param {string} doc
	 */
	defineSetting(name, initialValue, doc) {
		if (dottie.exists(this.var, name)) {
			console.warn(`overwriting setting: "${name}"`)
		}
		const [, callee] = parseStack(new Error().stack)

		dottie.set(this.var, name, {
			doc,
			value: initialValue,
			source: callee?.source,
			line: callee?.line,
			column: callee?.column,
		})

		this.dispatchEvent(
			new CustomEvent(`lb:defvar:${name}`, {detail: initialValue})
		)
	}

	defvar = this.defineSetting.bind(this)
	defcmd = this.defineCommand.bind(this)

	/**
	 * @param {string} name
	 * @param {any} value
	 */
	set(name, value) {
		dottie.set(this.var, `${name}.value`, value)
		this.dispatchEvent(new CustomEvent(`lb:set:${name}`, {detail: value}))
	}

	/**
	 * @template T
	 * @param {string} name
	 * @param {T} [defaultValue]
	 * @returns {T}
	 */
	get(name, defaultValue) {
		return dottie.get(this.var, `${name}.value`, defaultValue)
	}

	/**
	 * @param {string} name
	 * @param {any[]} args
	 */
	call(name, ...args) {
		try {
			return this.getcmd(name).apply(null, args)
		} catch (error) {
			console.error(`error calling command "${name}"`, error)
			throw error
		}
	}

	/**
	 * @param {string} name
	 */
	getcmd(name) {
		if (!dottie.exists(this.cmd, name)) {
			throw new Error(`no command named "${name}"`)
		}
		return dottie.get(this.cmd, `${name}.call`)
	}

	/**
	 * @param {string} name
	 */
	describeCommand(name) {
		if (!dottie.exists(this.cmd, name)) {
			throw new Error(`no docs for command named "${name}"`)
		}
		const cmd = dottie.get(this.cmd, name)
		const loc = cmd.source
			? `defined at <${cmd.source}:${cmd.line}:${cmd.column}>`
			: "without a source location"

		return `\`${name}\` is a${cmd.interactive ? "n interactive" : ""} command ${loc}.\n\n${cmd.doc ?? ""}`
	}

	/**
	 * @param {string} name
	 */
	describeSetting(name) {
		if (!dottie.exists(this.var, name)) {
			throw new Error(`no docs for setting named "${name}"`)
		}
		return dottie.get(this.var, name)
	}

	/**
	 *
	 * @param {typeof this.var} settings
	 * @param {function} fn
	 */
	let(settings, fn) {
		const backup = {}
		for (const [name, value] of Object.entries(settings)) {
			backup[name] = this.get(name)
			this.set(name, value)
		}
		fn()
		for (const [name, value] of Object.entries(backup)) {
			this.set(name, value)
		}
	}
}

/*
imagine this section happens in some other place
 */

const system = {
	workingDirectory: await window.__TAURI__.core.invoke(
		"initial_working_directory"
	),
	environmentVariables: await window.__TAURI__.core.invoke(
		"initial_environment_variables"
	),
}

new Littlebook(system)

// todo this will need to work, the user config will have to work that way too
//
//fetch(import.meta.resolve("./stdlib/entry.js")).then(response => {
// 	response.blob().then(blob => import(URL.createObjectURL(blob)))
//})

/* fetch("./stdlib/entry.js").then(response => {
	response.blob().then(blob => {
		import(URL.createObjectURL(blob))
	})
}) */

await import("./stdlib/entry.js")

//console.log(lb.describeCommand("lists.add"))
