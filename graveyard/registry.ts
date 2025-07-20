import type {Extension} from "@codemirror/state"

type Language = (url: URL) => Extension

declare module "littlebook" {
	export interface LittlebookSettings {
		"text-editor.languages": Record<string, Language>
		"text-editor.patterns": [RegExp, string][]
	}

	export interface LittlebookCommands {
		"match-pattern.url": (
			patterns: [RegExp, string][],
			url: URL | string,
			fallback: string
		) => string
		"text-editor.languages.get": (name: string) => Language | undefined
		"text-editor.languages.set": (name: string, language: Language) => void
		"text-editor.languages.match": (url: URL | string) => string
		"text-editor.languages.find": (url: URL | string) => Language
		"text-editor.patterns.add": (pattern: RegExp, name: string) => void
	}
}

lb.settings.define({
	id: "text-editor.languages",
	value: {},
	doc: "Registered languages for text files",
})

lb.settings.define({
	id: "text-editor.patterns",
	// todo this should be a List?
	value: [],
	doc: "File name patterns for matching URLs to text editor languages",
})

lb.commands.define({
	id: "text-editor.patterns.add",
	doc: "Add a pattern to the text editor patterns",
	fn(pattern: RegExp, name: string) {
		const patterns = lb.settings.get("text-editor.patterns")
		patterns.push([pattern, name])
		lb.settings.set("text-editor.patterns", patterns)
	},
})

lb.commands.define({
	doc: "get a text editor language by name",
	id: "text-editor.languages.get",
	fn(name: string) {
		return lb.settings.get(`text-editor.languages.${name}`)
	},
})

lb.commands.define({
	doc: "set a text editor language by name",
	id: "text-editor.languages.set",
	fn(name: string) {
		return lb.settings.get(`text-editor.languages.${name}`)
	},
})

lb.commands.define({
	id: "text-editor.languages.match",
	doc: "get the text editor language for a url",
	fn(url: URL | string) {
		return lb.commands.call(
			"match-pattern.url",
			lb.settings.get("text-editor.patterns"),
			url,
			"plain"
		)
	},
})

lb.commands.define({
	id: "text-editor.languages.find",
	doc: "get the text editor language for a url",
	fn(url: URL | string) {
		return lb.commands.call(
			"text-editor.languages.get",
			lb.commands.call("text-editor.languages.match", url)
		)
	},
})

lb.commands.define({
	id: "match-pattern.url",
	doc: `Match a \`url\` against a set of \`patterns\`, returning the name of the first match or a \`fallback\`.`,
	fn(patterns: [RegExp, string][], url: URL | string, fallback: string) {
		if (typeof url != "string") {
			url = url.toString()
		}

		for (const [pattern, name] of patterns) {
			if (pattern.test(url)) {
				return name
			}
		}

		return fallback
	},
})
