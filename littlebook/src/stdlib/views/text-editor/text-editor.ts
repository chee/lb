import Codemirror from "./codemirror.ts"
import {keymap} from "@codemirror/view"
import type {
	LittlebookFileHandle,
	LittlebookSurface,
	LittlebookView,
} from "littlebook"
import type {Extension} from "@codemirror/state"
import Registry from "../../../core/structures/registry.ts"
import type {TextEditorLanguage} from "./languages/languages.ts"
import {JavaScript} from "./languages/javascript.ts"
export const log = lb.log.extend("text-editor")

declare module "littlebook" {
	export interface LittlebookMode {
		codemirrorExtension?: Extension
	}

	export interface LittlebookExtensions {
		textEditor: TextEditor
	}
}

export class TextEditor implements LittlebookView<LittlebookFileHandle> {
	name = "text editor"
	// todo use simple objects and functions instead of all these special Registry and WarningMap things
	static languages = new Registry<URL | string, TextEditorLanguage>(
		"text editor language"
	)
	static use() {
		// @ts-expect-error erkglaergklmaelrgkam
		lb.views.register("text editor", TextEditor)
		const js = /\.[mc]?[tj]sx?$/
		TextEditor.languages.registerMatcher(
			url => !!url.toString().match(js),
			"javascript"
		)
		TextEditor.languages.register("javascript", JavaScript)
		console.log(TextEditor.languages)
		lb.views.registerMatcher(handle => {
			return !!handle.url.pathname.match(js)
		}, "text editor")
	}
	constructor(
		public readonly surface: LittlebookSurface<LittlebookFileHandle>
	) {}

	codemirror: Codemirror

	async render(element: HTMLElement) {
		const language = TextEditor.languages.find(this.surface.handle.url)
		console.log({language})
		log(
			`rendering text editor for ${this.surface.handle.url} using ${
				language?.name ?? "plain"
			}`
		)
		this.codemirror = new Codemirror({
			parent: element,
			content: await this.surface.handle.text(),
			language: language?.(this.surface.handle.url),
			extensions: [
				keymap.of([
					{
						key: "Meta-s",
						run() {
							this.surface.handle.save(
								this.codemirror.view.state.doc.toString()
							)
							return true
						},
					},
				]),
				this.surface.modes
					.filter(mode => mode.codemirrorExtension)
					.map(mode => mode.codemirrorExtension),
			],
		})
	}
	destroy(): void {
		this.codemirror.view.destroy()
	}
	focus(): void {
		this.codemirror.view.focus()
	}
	refit(): void {}
}
