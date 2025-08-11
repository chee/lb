/** @jsxRuntime automatic */
/** @jsxImportSource solid-js/h */
import {type Extension} from "@codemirror/state"
import {log, registerPackage, Vibe} from "littlebook"
import {createSignal} from "solid-js"
import {LbSet} from "../utility/set.ts"
import Codemirror from "./codemirror.ts"
import {TextEditorLanguage} from "./languages/languages.ts"
import {
	createEffect,
	createRoot,
	createStore,
	onCleanup,
} from "@solidjs/signals"
import * as s from "sury"
import {Dynamic, render} from "solid-js/web"

/*
 * ok so we will load extensions based on the URL
 * and extensions based on the language
 */

const languages = {
	typescript: {
		name: "TypeScript",
		extension: [],
	},
	javascript: {
		name: "JavaScript",
		extension: [],
	},
	tsx: {
		name: "TSX",
		extension: [],
	},
	jsx: {
		name: "JSX",
		extension: [],
	},
	css: {
		name: "CSS",
		extension: [],
	},
	markdown: {
		name: "Markdown",
		extension: [],
	},
} as Record<string, TextEditorLanguage>

const autolangs = new LbSet<[RegExp, TextEditorLanguage]>(
	[/\.js$/, languages.js],
	[/\.ts$/, languages.ts],
	[/\.tsx$/, languages.tsx],
	[/\.jsx$/, languages.jsx],
	[/\.css$/, languages.css],
	[/\.md$/, languages.md]
)

const surfaces = {}

function createSurface(callback: () => HTMLElement, props = Object) {
	const id = Math.random().toString(36).slice(2)
	let destroy: () => void
	const [vibes, setVibes] = createStore([] as Vibe[])
	const dom = createRoot(clean => {
		destroy = clean
		return callback()
	})
}

function createTextEditor() {
	const [languageName, setLanguageName] = createSignal<string>()
	const language = () =>
		languageName() ? languages[languageName()!] : undefined
	return createSurface(
		surface => {
			// props.create
			// props.setSave(() => codemirror.view.state.doc.toString())
			const codemirror = new Codemirror({
				parent: props.element,
				language: language(),
				extensions: [
					pkg.settings.extensions,
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
					// OpstreamTextPlugin(this.surface),
					props.vibes
						.filter(vibe => vibe.codemirrorExtension)
						.map(vibe => vibe.codemirrorExtension),
				],
			})
			createEffect(
				language,
				language => language && codemirror.setLanguage(language)
			)
			onCleanup(() => codemirror.view.destroy())
			return codemirror.view
		},
		{
			// todo inlets and outlets isn't quite right, is it?
			// idk... a text editor is a source, but it can also get its content from a
			inlets: {
				doc: s.string,
			},
			outlets: {
				doc: s.string,
			},
			onSave() {},
			commands: {},
		}
	)
}

var pkg = registerPackage({
	name: "text",
	settings: {
		languages: {} as Record<string, TextEditorLanguage>,
		languagePatterns: new LbSet<readonly [RegExp, string]>(),
		extensions: [] as Extension[],
	},
	commands: {},
	views: {createTextEditor},
	//	vibes: {}
})

export function getLanguageName(url: string | URL): string | undefined {
	url = url.toString()
	return pkg.settings.languagePatterns.find(([pattern]) =>
		url.match(pattern)
	)?.[1]
}

export function getLanguage(url: string | URL): TextEditorLanguage | undefined {
	return pkg.settings.languages[getLanguageName(url)!]
}

export function addLanguage(name: string, language: TextEditorLanguage) {
	pkg.settings.languages[name] = language
}

export function addLanguagePattern(pattern: RegExp, languageName: string) {
	const match = [pattern, languageName] as const
	pkg.settings.languagePatterns.add(match)
	return () => pkg.settings.languagePatterns.delete(match)
}
