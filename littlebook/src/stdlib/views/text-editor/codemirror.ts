import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection,
} from "@codemirror/view"
import {
	highlightSelectionMatches,
	search,
	searchKeymap,
} from "@codemirror/search"
import {indentUnit} from "@codemirror/language"
import {
	cursorSubwordBackward,
	cursorSubwordForward,
	defaultKeymap as codemirrorDefaultKeymap,
	deleteToLineEnd,
	// todo add more emacs bindings
	// todo make a setting
	emacsStyleKeymap,
	history,
	indentWithTab,
	selectSubwordBackward,
	selectSubwordForward,
} from "@codemirror/commands"
import {Compartment, EditorState, type Extension} from "@codemirror/state"

import theme from "./theme.ts"
import {mod, modshift} from "../../util/modshift.js"
export const defaultKeyMap = [
	indentWithTab,
	...emacsStyleKeymap,
	...searchKeymap,
	...codemirrorDefaultKeymap,
	{
		key: "Alt-b",
		run: cursorSubwordBackward,
		shift: selectSubwordBackward,
		preventDefault: true,
	},
	{
		key: "Alt-f",
		run: cursorSubwordForward,
		shift: selectSubwordForward,
	},
	{
		key: "Alt-d",
		run(view: EditorView) {
			selectSubwordForward(view)
			view.dispatch({
				changes: view.state.selection.ranges,
				scrollIntoView: true,
				userEvent: "delete.cut",
			})
			return true
		},
	},
	{
		key: "Ctrl-k",
		run(view: EditorView) {
			const s = view.state.selection.main.head
			const le = view.lineBlockAt(s).to
			navigator.clipboard.writeText(view.state.sliceDoc(s, le))
			deleteToLineEnd(view)
			return true
		},
	},
]

export interface CodemirrorOptions {
	content?: string
	state?: EditorState
	language?: Extension
	parent?: HTMLElement
	shadow?: ShadowRoot
	extensions?: Extension[]
}

export default class Codemirror {
	// keymap = new Compartment()
	/** @default any */
	extensions = new Compartment()
	/** @default any */
	language = new Compartment()
	view: EditorView

	constructor(opts: CodemirrorOptions) {
		const extensions = this.extensions.of(opts.extensions ?? [])
		// todo get keys from minor modes
		const keys = keymap.of(defaultKeyMap)
		const language = this.language.of(opts.language ?? [])
		this.view = new EditorView({
			state: opts.state,
			root: opts.shadow,
			parent: opts.parent,
			doc: opts.content,
			extensions: [
				theme,
				search(),
				history(),
				// autocompletion(),
				drawSelection(),
				// todo this is all stuff for minor modes
				// todo this all needs configurable via settings
				indentUnit.of("\t"),
				highlightSpecialChars(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				EditorView.lineWrapping,
				// todo also some of it is part of the language like `code`
				lineNumbers(),
				EditorState.allowMultipleSelections.of(true),
				EditorState.tabSize.of(2),
				EditorView.clickAddsSelectionRange.of(event => {
					const mask = modshift(event)
					if (mask == 1 << mod.option) return true
					return false
				}),
				keys,
				rectangularSelection({
					eventFilter(event) {
						const mask = modshift(event)
						if (mask == ((1 << mod.shift) | (1 << mod.option))) return true
						return false
					},
				}),
				language,
				extensions,
			],
		})
	}

	get element() {
		return this.view.dom
	}

	setLanguage(language: Extension) {
		const effect = this.language.reconfigure(language)
		this.view.dispatch({effects: effect})
	}

	getExtensions() {
		return this.extensions.get(this.view.state) ?? []
	}

	setExtensions(ext: Extension) {
		const effect = this.extensions.reconfigure(ext)
		this.view.dispatch({effects: effect})
	}
}
