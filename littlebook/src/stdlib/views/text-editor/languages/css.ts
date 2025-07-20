import {css} from "@codemirror/lang-css"
import type {TextEditorLanguage} from "./languages.ts"

export const CSSLanguage: TextEditorLanguage = () => ({
	name: "css",
	extension: [css()],
})
