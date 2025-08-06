import * as typescriptVFS from "@typescript/vfs"
import {createWorker as createCodemirrorTsWorker} from "@valtown/codemirror-ts/worker"
import * as Comlink from "comlink"
import typescript from "typescript"

// todo this needs to be settingsable?
const compilerOptions: typescript.CompilerOptions = {
	target: typescript.ScriptTarget.ESNext,
	module: typescript.ModuleKind.ESNext,
	moduleResolution: typescript.ModuleResolutionKind.Bundler,
	lib: ["ESNext", "DOM"],
	allowImportingTsExtensions: true,
	noEmit: true,
	strict: true,
	allowJs: true,
	noCheck: true,
	composite: true,
	isolatedModules: true,
}

// // todo provide the map inside the system
// const fsMap = await typescriptVFS
// 	.createDefaultMapFromCDN({}, typescript.version, true, typescript, lzstring)
// 	.catch(error => {
// 		console.error("Error creating default map:", error)
// 	})

const system = typescriptVFS.createSystem(new Map<string, string>())
const environment = typescriptVFS.createVirtualTypeScriptEnvironment(
	system,
	[],
	typescript,
	compilerOptions
)

const decoder = new TextDecoder()

const worker = {
	codemirrorTsWorker: createCodemirrorTsWorker({
		env: environment,
		onFileUpdated(_file) {},
	}) as ReturnType<typeof createCodemirrorTsWorker>,
	createFile(url: string, content: Uint8Array | string) {
		environment.createFile(
			url,
			typeof content == "string" ? content : decoder.decode(content)
		)
	},
	updateFile(url: string, content: Uint8Array, from?: number, to?: number) {
		if (from != null && to != null) {
			environment.updateFile(
				url,
				decoder.decode(content),
				typescript.createTextSpan(from, to - from)
			)
		} else {
			environment.updateFile(url, decoder.decode(content))
		}
	},
	getTypeDefinitionAtPosition(url: string, position: number) {
		return environment.languageService.getTypeDefinitionAtPosition(
			url,
			position
		)
	},
	getDefinitionAtPosition(url: string, position: number) {
		return environment.languageService.getDefinitionAtPosition(url, position)
	},
}

export type TypescriptWorker = typeof worker

Comlink.expose(worker)
