;(async function () {
	const tauri = window.__TAURI__
	await import("/esbuild.js")
	await window.esbuild.initialize({wasmURL: "/esbuild.wasm"})

	/**
	 *
	 * @param {string|URL} path
	 * @returns
	 */
	async function read(path) {
		return tauri.fs.readFile(path)
	}

	/**
	 * @param {string|URL} path
	 * @param {Uint8Array} bytes
	 * @returns
	 */
	async function write(path, bytes) {
		return tauri.fs.writeFile(path, bytes)
	}

	/**
	 * @param {string|URL} path
	 * @returns
	 */
	async function list(path) {
		const entries = await tauri.fs.readDir(path)
		return entries.map(entry => ({
			name: entry.name,
			type: entry.isDirectory ? "directory" : entry.isSymlink ? "link" : "file",
		}))
	}

	/**
	 * @param {string|URL} path
	 * @returns
	 */
	async function stat(path) {
		const stat = await tauri.fs.stat(path)
		return {
			size: stat.size,
			modified: stat.mtime,
			type: stat.isDirectory ? "directory" : stat.isSymlink ? "link" : "file",
		}
	}

	/**
	 *
	 * @param {string} path
	 * @param {{parents: boolean}} options
	 * @returns
	 */
	async function mkdir(path, options = {parents: false}) {
		return tauri.fs.mkdir(path, {
			recursive: options.parents,
		})
	}

	const env = await tauri.core.invoke("initial_environment_variables")
	const cwd = await tauri.core.invoke("initial_working_directory")

	const data = await tauri.path.dataDir()
	const home = await tauri.path.homeDir()
	// todo recursively copy the system folder here
	const systemDirectory = await tauri.path.join(data, "Littlebook")
	// todo create a init.ts
	const userDirectory = await tauri.path.join(home, ".config", "littlebook")
	// interesting... now that we are in a non-module context we could update the import map
	// by reading a userDirectory importmap.json!
	await tauri.fs.mkdir(userDirectory, {recursive: true})
	try {
		const importmap = await tauri.fs.readTextFile(
			await tauri.path.join(userDirectory, "importmap.json")
		)
		if (importmap) {
			document.head.appendChild(
				Object.assign(document.createElement("script"), {
					type: "importmap",
					innerHTML: importmap,
				})
			)
		}
	} catch {}

	// todo type this in littlebook. a Host is an important thing
	const host = {
		read,
		write,
		list,
		stat,
		env,
		cwd,
		mkdir,
		systemDirectory,
		userDirectory,
		protocol: "file:",
	}

	/**
	 *
	 * @param {string} path
	 * @returns
	 */
	function dirname(path) {
		if (!path || path === "/") return "/"
		path = path.replace(/\/+$/, "")
		const lastSlash = path.lastIndexOf("/")
		if (lastSlash === -1) return "." // No slash found
		if (lastSlash === 0) return "/" // Root directory
		return path.slice(0, lastSlash) + "/"
	}
	/**
	 *
	 * @param {string} path
	 * @returns
	 */
	function ext(path) {
		const lastDot = path.lastIndexOf(".")
		if (lastDot === -1 || lastDot === path.length - 1) return ""
		return path.slice(lastDot + 1)
	}
	esbuild.transform()
})()

esbuild
	.transform(`console.log("hello world")`)
	.then(result => eval(result.code))
	.catch(console.error)

const coreDirectory = `/Users/chee/soft/chee/lb/littlebook/src/core/`

const loaderMap = {}

const output = await esbuild.build({
	entryPoints: [`${coreDirectory}littlebook.ts`],
	sourcemap: true,
	bundle: true,
	format: "esm",
	outdir: "/",
	metafile: true,
	define: {
		"process.env.LITTLEBOOK_MODE": JSON.stringify("TAURI"),
	},
	plugins: [
		eternal,
		{
			name: "taurifs",
			setup(ctx) {
				const namespace = "taurifs"
				ctx.onResolve({filter: /.*/}, async args => {
					let path = args.path
					if (path.startsWith("file")) {
						path = path.slice(7)
					}
					const isRelative = path.match(/^\./)
					if (isRelative) {
						path = new URL(path, "file://" + args.resolveDir + "/").pathname
					}
					//if (await tauri.fs.exists(path)) {
					return {
						namespace,
						path,
					}
					//} else {
					//	return {}
					//}
				})
				ctx.onLoad({filter: /.*/, namespace}, async args => {
					let path = args.path
					const content = await read(path)
					const extension = ext(path)
					return {
						contents: content,
						loader:
							loaderMap[/** @type {keyof typeof loaderMap} */ (path)] ??
							extension,
						resolveDir: dirname(path),
					}
				})
			},
		},
	],
})

const lb = output.outputFiles?.find(file => file.path.endsWith(".js"))
if (!lb) {
	throw new Error("littlebook.js not found in output")
}

const lblob = new Blob([lb.contents], {type: "application/javascript"})
const lburl = URL.createObjectURL(lblob)
const script = document.createElement("script")
script.type = "module"
script.src = lburl
document.head.append(script)

const lstyle = output.outputFiles?.find(file => file.path.endsWith(".css"))
if (lstyle) {
	const lstyleblob = new Blob([lstyle.contents], {type: "text/css"})
	const lstyleurl = URL.createObjectURL(lstyleblob)
	const style = document.createElement("link")
	style.rel = "stylesheet"
	style.href = lstyleurl
	document.head.append(style)
}

export default async function level0() {
	const js = await import(lburl)
}
