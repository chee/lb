import Codemirror from "./codemirror.ts"
import {keymap} from "@codemirror/view"
import type {Extension} from "@codemirror/state"
import type {TextEditorLanguage} from "./languages/languages.ts"
import {LbSet} from "../utility/set.ts"

declare module "littlebook" {
	export interface Vibe {
		codemirrorExtension?: Extension
	}

	export interface Packages {
		textFileEditor: typeof textFileEditorPackage
	}
}

export function use() {
	lb.packages.textFileEditor = textFileEditorPackage
	lb.views.textFileView = TextFileView
}

export const TextFileView: LbViewCreator<LbFilehandle> = props => {
	const languageName = textFileEditorPackage.languagePatterns.find(
		([pattern]) => props.resource.url.toString().match(pattern)
	)?.[1]
	console.log(textFileEditorPackage.languages[languageName])
	const language = textFileEditorPackage.languages[languageName ?? "plain"]
	const log = lb.log.extend("text-editor")
	log(
		`rendering text editor for ${props.resource.url} using ${
			language?.name ?? "plain"
		}`
	)

	// todo is this enough?
	return async element => {
		const codemirror = new Codemirror({
			parent: element,
			content: await props.resource.text(),
			language: language?.(new URL(props.resource.url)),
			extensions: [
				keymap.of([
					{
						stopPropagation: true,
						key: "Meta-s",
						preventDefault: true,
						run() {
							props.resource.save(codemirror.view.state.doc.toString())
							return true
						},
					},
				]),
				props.modes
					.filter(mode => mode.codemirrorExtension)
					.map(mode => mode.codemirrorExtension),
			],
		})
		return () => {
			codemirror.view.destroy()
		}
	}
}

// todo think about this deeply
export const textFileEditorPackage = {
	name: "xyz.littlebook.text-files",
	languages: {} as Record<string, TextEditorLanguage>,
	addLanguage(name: string, language: TextEditorLanguage) {
		this.languages[name] = language
	},
	languagePatterns: new LbSet<readonly [RegExp, string]>(),
	addLanguagePattern(pattern: RegExp, languageName: string) {
		const match = [pattern, languageName] as const
		textFileEditorPackage.languagePatterns.add(match)
		return () => textFileEditorPackage.languagePatterns.delete(match)
	},
	provides: {
		modes: {},
		views: {TextFileView},
		settings: {},
		commands: {},
	},
}
