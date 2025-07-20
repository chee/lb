import Codemirror from "./codemirror.ts"
import {keymap} from "@codemirror/view"
import type {LbFilehandle, LbSurface, LbView} from "littlebook"
import type {Extension} from "@codemirror/state"
import type {TextEditorLanguage} from "./languages/languages.ts"
import {JavaScript} from "./languages/javascript.ts"
import {createRegistry} from "../../../core/structures/registry.ts"

declare module "littlebook" {
	export interface LbMode {
		codemirrorExtension?: Extension
	}

	export interface LittlebookExtensions {
		textEditor: TextEditor
	}
}

const languageRegistry = createRegistry<URL | string, TextEditorLanguage>(
	"text editor language"
)

// i think this is where i started thinking about the idea of an `lb.createExtension` thing, where you can
// create an LbExtension, it'll be on `lb.extensions` and its static settings ["a", "b"] properties will
// be available as settings
// and its static commands ["c", "d"] will be available as commands to bind keys to
// or something like a runtime version of the vscode contribution points
export class TextEditor implements LbView<LbFilehandle> {
	name = "xyz.littlebook.text-editor"
	log = lb.log.extend("text-editor")
	// todo use simple objects and functions instead of all these special Registry and WarningMap things
	static languages = languageRegistry.items
	static registerLanguage(language: TextEditorLanguage) {
		languageRegistry.register(language.name, language)
	}
	static languagePatterns: [RegExp, string][] = []

	static use() {
		lb.views.register(this.name, TextEditor)
		const js = /\.[mc]?[tj]sx?$/
		TextEditor.languagePatterns.push([js, "javascript"])
		TextEditor.languages["javascript"] = JavaScript
		lb.views.registerMatcher(handle => {
			return !!handle.url.pathname.match(js)
		}, this.name)
	}
	constructor(public readonly surface: LbSurface<LbFilehandle>) {}

	codemirror: Codemirror

	async render(element: HTMLElement) {
		const languageName = TextEditor.languagePatterns.find(([pattern]) =>
			this.surface.handle.url.pathname.match(pattern)
		)?.[1]

		const language = TextEditor.languages[languageName ?? "plain"]

		this.log(
			`rendering text editor for ${this.surface.handle.url} using ${
				language?.name ?? "plain"
			}`
		)

		const surface = this.surface
		const codemirror = new Codemirror({
			parent: element,
			content: await this.surface.handle.text(),
			language: language?.(this.surface.handle.url),
			extensions: [
				keymap.of([
					{
						stopPropagation: true,
						key: "Meta-s",
						preventDefault: true,
						run() {
							surface.handle.save(codemirror.view.state.doc.toString())
							return true
						},
					},
				]),
				this.surface.modes
					.filter(mode => mode.codemirrorExtension)
					.map(mode => mode.codemirrorExtension),
			],
		})
		this.codemirror = codemirror
	}
	destroy(): void {
		this.codemirror.view.destroy()
	}
	focus(): void {
		this.codemirror.view.focus()
	}
	refit(): void {}
}
