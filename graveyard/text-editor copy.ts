// todo having to do this makes it seem like my idea is not good
import "./registry.ts"
import "../littlebook/stdlib/views/text-editor/languages/languages.ts"
import Codemirror from "../littlebook/stdlib/views/text-editor/codemirror.ts"
import {keymap} from "@codemirror/view"
import type {CreateLittlebookView, LittlebookFileHandle} from "littlebook"
import type {Extension} from "@codemirror/state"
export const log = lb.log.extend("text-editor")

declare module "littlebook" {
	export interface LittlebookMode {
		codemirrorExtension?: Extension
	}
}

// todo i wonder if instead of a function, a view creator should be a class
export const createTextEditor: CreateLittlebookView<
	LittlebookFileHandle
> = async surface => {
	// todo maybe this shouldn't be done through commands and settings
	// todo maybe commands and settings are a trap
	// todo we'll figure out the ergonomics as we go
	// todo i really feel like i need a macro language

	// if there were such a thing as Extensions, then functions defined on those
	// might be able to be turned into commands automatically
	// wrapping up functionality in a class might be a nice interface.
	// so far i have wanted to capture everything together
	// so maybe lb.extensions.textEditor is a cool idea
	// remember when girls would say kewl c:
	// miaow ^.^
	// they could even list their commands and settings in their static
	// (like `static get observedAttributes()` on custom elements)
	// static get commands() ["prop1", "prop2"]
	// and then the class could be `.toString()` and parsed just like the old
	// function code (lol old, from wednesday)
	// then typescript still works, it's all on the runtime global,
	// the user can inject themselves into the static properties
	// the schema can be derived from the .toString(), the bundler
	// can maybe even convert TS to JSDoc so there is a way to do it with either
	// ts -> jsdoc -> json schema ???
	// normal devtools even work well again... this is really interesting
	const languageName = lb.commands.call(
		"text-editor.languages.match",
		surface.handle.url
	)
	log(`the language for ${surface.handle.url} is ${languageName}`)
	const language = lb.commands.call("text-editor.languages.get", languageName)

	const editor = new Codemirror({
		content: await surface.handle.text(),
		language: language?.(surface.handle.url),
		extensions: [
			keymap.of([
				{
					key: "Meta-s",
					run() {
						surface.handle.save(editor.view.state.doc.toString())
						return true
					},
				},
			]),
			surface.modes
				.filter(mode => mode.codemirrorExtension)
				.map(mode => mode.codemirrorExtension),
		],
	})

	return {
		name: "text-editor",
		render(element) {
			element.appendChild(editor.element)
		},
		destroy() {
			editor.view.destroy()
		},
		focus() {
			editor.view.focus()
		},
		refit() {
			// no-op, codemirror handles its own resizing
		},
		surface,
	}
}

export default createTextEditor
