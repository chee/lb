import type {Extension} from "@codemirror/state"

export interface Language {
	name: string
	extension: Extension
}

export type TextEditorLanguage = (url: URL) => Language
