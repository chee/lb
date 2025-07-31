import Codemirror from "./codemirror.ts"
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"
import type {Extension} from "@codemirror/state"
import type {TextEditorLanguage} from "./languages/languages.ts"
import {LbSet} from "../utility/set.ts"
import {
	log,
	OpstreamText,
	registerPackage,
	SetOp,
	Surface,
	TextOp,
	View,
} from "littlebook"

declare module "littlebook" {
	export interface Vibe {
		codemirrorExtension?: Extension
	}

	export interface Packages {
		text: typeof pkg
	}
}

const OpstreamTextPlugin = (surface: Surface<"text">) =>
	ViewPlugin.fromClass(
		class {
			view: EditorView
			cleanup: () => void
			constructor(view: EditorView) {
				this.view = view
				this.cleanup = surface.opstream.connect(this.connection)
			}
			me = false

			connection = (op: TextOp | SetOp<string>) => {
				if (!("agent" in op) || op.agent === surface.id) return

				if (!("type" in op)) {
					this.me = true
					this.view.dispatch({
						changes: {
							from: op.from,
							to: op.to,
							insert: op.content,
						},
					})
					this.me = false
				}
			}
			update(update: ViewUpdate) {
				if (update.docChanged) {
					for (const tr of update.transactions) {
						if (this.me) continue
						if (tr.changes.empty) continue
						tr.changes.iterChanges((fromA, toA, fromB, toB, text) => {
							surface.opstream.apply({
								agent: surface.id,
								from: fromB,
								to: toA,
								content: text.toString(),
							})
						})
					}
				}
			}
			destroy() {
				this.cleanup()
			}
		}
	)

export class TextEditor implements View<"text"> {
	static optype = "text"
	surface: Surface<"text">
	languageName: string | undefined
	language: TextEditorLanguage | undefined
	log: typeof log
	constructor(surface: Surface<"text">) {
		this.surface = surface
		this.languageName = pkg.settings.languagePatterns.find(([pattern]) =>
			this.surface.url?.toString().match(pattern)
		)?.[1]
		this.language = pkg.settings.languages[this.languageName ?? "plain"]
		this.log = log.extend("text-editor")
	}
	mount(element: HTMLElement) {
		const codemirror = new Codemirror({
			content: this.surface.opstream.value,
			parent: element,
			language: this.language?.(new URL(this.surface.url)),
			extensions: [
				// keymap.of([
				// 	{
				// 		stopPropagation: true,
				// 		key: "Meta-s",
				// 		preventDefault: true,
				// 		run() {
				// 			props.resource.save(codemirror.view.state.doc.toString())
				// 			return true
				// 		},
				// 	},
				// ]),
				OpstreamTextPlugin(this.surface),
				this.surface.vibes
					.filter(vibe => vibe.codemirrorExtension)
					.map(vibe => vibe.codemirrorExtension),
			],
		})
		return () => {
			codemirror.view.destroy()
		}
	}
}

var pkg = registerPackage({
	name: "text",
	settings: {
		languages: {} as Record<string, TextEditorLanguage>,
		languagePatterns: new LbSet<readonly [RegExp, string]>(),
	},
	commands: {},
	views: {TextEditor},
})

export function addLanguage(name: string, language: TextEditorLanguage) {
	pkg.settings.languages[name] = language
}

export function addLanguagePattern(pattern: RegExp, languageName: string) {
	const match = [pattern, languageName] as const
	pkg.settings.languagePatterns.add(match)
	return () => pkg.settings.languagePatterns.delete(match)
}
