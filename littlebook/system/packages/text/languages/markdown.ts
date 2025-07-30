import {markdown} from "@codemirror/lang-markdown"
import {yamlFrontmatter} from "@codemirror/lang-yaml"
import {
	javascriptLanguage,
	jsxLanguage,
	tsxLanguage,
	typescriptLanguage,
} from "@codemirror/lang-javascript"
import {LanguageDescription} from "@codemirror/language"
import type {TextEditorLanguage} from "./languages.ts"

// todo make configurable
const codeLanguages = {
	jsx: jsxLanguage,
	tsx: tsxLanguage,
	ts: typescriptLanguage,
	typescript: typescriptLanguage,
	js: javascriptLanguage,
	javascript: javascriptLanguage,
	css: LanguageDescription.of({
		name: "css",
		async load() {
			const {css} = await import("@codemirror/lang-css")
			return css()
		},
	}),
}

export const Markdown: TextEditorLanguage = () => {
	return {
		name: "markdown",
		extension: [
			yamlFrontmatter({
				content: markdown({
					addKeymap: true,
					// todo all that lazy importing stuff from txt/worldwideweb/littlebook
					// todo also all the sans serif stuff -- though that's a minor mode concern maybe
					// todo although that could also be something configurable through CSS
					codeLanguages(source) {
						return codeLanguages[source] ?? null
					},
				}),
			}),
		],
	}
}
