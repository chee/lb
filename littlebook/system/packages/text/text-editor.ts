import {render} from "solid-js/web"
import Codemirror from "./codemirror.ts"

import {type Extension} from "@codemirror/state"
import {createEffect} from "@solidjs/signals"
import {log, registerPackage} from "littlebook"
import {LbSet} from "../utility/set.ts"
import type {TextEditorLanguage} from "./languages/languages.ts"

declare module "littlebook" {
	export interface Vibe {
		codemirrorExtension?: Extension
	}

	export interface Packages {
		text: typeof pkg
	}
}

export function getLanguageName(url: string | URL): string | undefined {
	url = url.toString()
	return pkg.settings.languagePatterns.find(([pattern]) =>
		url.match(pattern)
	)?.[1]
}

export function getLanguage(url: string | URL): TextEditorLanguage | undefined {
	return pkg.settings.languages[getLanguageName(url)!]
}

export class TextEditor {
	log: typeof log = log
	mount(element: HTMLElement) {
		const codemirror = new Codemirror({
			parent: element,
			//			language: this.language?.(new URL(this.surface.url)),
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
				// this.surface.vibes
				// 	.filter(vibe => vibe.codemirrorExtension)
				// 	.map(vibe => vibe.codemirrorExtension),
			],
		})

		render(() => {
			createEffect(
				() => pkg.settings.extensions,
				extensions => {
					codemirror.setExtensions(extensions)
				}
			)
			return codemirror.view.dom
		}, element)

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
		extensions: [] as Extension[],
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
