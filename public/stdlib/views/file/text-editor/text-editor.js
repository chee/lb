/** @import { FileEditor } from ':global/file-editor-registry.ts' */
import events from ":global/events.js"
import "./registry.js"
import {Text} from "@codemirror/state"
import TextEditor from "./codemirror.js"
import debug from ":global/log.js"
import {keymap} from "@codemirror/view"
export const log = debug.extend("text-file-editor")
const textmap = new Map()
const decoder = new TextDecoder()
const encoder = new TextEncoder()
// todo if i got passed the panel element or id or something there'd be a way
// for me to listen to events. that's shouldn't be dockview specific. when you
// make a Panel in anything you should set it up that focusing that panel makes
// it the .active and then there can be an event or something to listen to for
// when you get made active
/**
 * @param {any} props
 * @returns {any}
 */
const textEditor = props => {
	const stored = textmap.get(props.url.pathname)
	let content = stored
	// i don't know if there's a way of making two codemirror instances share the
	// same underlying text object lol maybe i should use automerge to sync them,
	// create an automerge doc for every loaded text file and add the sync
	// plugin... it would work
	if (!stored || stored.length != props.bytes.length) {
		const txt = decoder.decode(props.bytes)
		content = Text.of(txt.split("\n"))
		textmap.set(props.url.pathname, content)
	}
	const languageName = lb.registries.textEditorLanguage.matchName(props.url)
	log(`the language for ${props.url} is ${languageName}`)
	const language = lb.registries.textEditorLanguage.get(languageName)
	const editor = new TextEditor({
		content: content,
		language: language?.(props),
		extensions: [
			keymap.of([
				{
					key: "Meta-s",
					run() {
						props.save(encoder.encode(editor.view.state.doc.toString()))
						return true
					},
				},
			]),
		],
	})
	// textmap.set(props.url, editor.view.state.doc)
	// todo now we need to:
	// 1. run the hooks for this language name from lb.hooks.textEditorLanguage
	// 2. grab all the minor modes from lb.active.modes
	// 3. add any extensions they have to the editor
	// hmmmm maybe actually instead of calling the language out here we should only pass the language _name_ (and url) into the text editor and have it be responsible for all ^ that?
	// editor.element.setAttribute("language", languageName)
	return editor.element
}
events.once("lb:file-editor-registry:installed", () => {
	log("installing text editor")
	lb.registries.fileEditor.register("text", textEditor)
})
events.once("lb:text-editor-language-registry:installed", () => {})
