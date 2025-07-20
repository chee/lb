import {javascript} from "@codemirror/lang-javascript"
import type {TextEditorLanguage} from "./languages.ts"

export const JavaScript: TextEditorLanguage = url => {
	return {
		name: "javascript",
		extension: javascript({
			jsx: url.pathname.endsWith("x"),
			typescript: url.pathname.startsWith("t"),
		}),
	}
}
