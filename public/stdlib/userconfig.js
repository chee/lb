// a pretend config file

import {readFile} from "./views/file/tauri-file-manager.js"
import {javascript} from "@codemirror/lang-javascript"
import TextEditor from "./views/file/text-editor/codemirror.js"
set("text-editor-languages.javascript", props => [
	javascript({
		jsx: props.url.pathname.endsWith("x"),
		typescript: props.url.pathname.startsWith("t"),
	}),
])

call("add-to-list", get("text-editor-languages.patterns"), [
	/\.[tj]sx?$/,
	"javascript",
])

const decoder = new TextDecoder()
const encoder = new TextEncoder()

defvar("surface-file", {}, "A map of surface to their current file object")
defcmd("surface-file", id => call("object-get", "surface-file", id))

lb.registerView("file", async surface => {
	const fileEditorName = call(
		"match-url-pattern",
		get("file-editors.patterns"),
		surface.url
	)

	const file = await readFile(surface.url)
	call("object-set", "surface-file", surface.id, file)

	if (fileEditorName) {
		const fileEditor = get(`file-editors.${fileEditorName}`)
		surface.element = fileEditor(surface)
	}

	const textLanguage = call(
		"match-url-pattern",
		get("text-editor-languages.patterns"),
		surface.url,
		"text-editor"
	)
	lb.dispatchEvent(
		new CustomEvent(`language:${textLanguage}`, {
			detail: {surface},
		})
	)
	const language = get(`text-editor-languages.${textLanguage}`)
	const editor = new TextEditor({
		content: decoder.decode(file.bytes),
		language: language(surface),
		extensions: surface.modes
			.map(mode => mode.codemirrorExtensions)
			.filter(Boolean),
	})

	surface.element = editor.element
	surface.editor = editor
	return surface
})

lb.associate([/^file:/, "file"])
console.log("userconfig.js loaded")
