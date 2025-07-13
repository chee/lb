import { autocompletion } from "@codemirror/autocomplete"
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  highlightTrailingWhitespace,
  KeyBinding,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view"
import {
  highlightSelectionMatches,
  search,
  searchKeymap,
} from "@codemirror/search"

import {
  defaultHighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language"
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
import { Compartment, EditorState, type Extension } from "@codemirror/state"
import { mod, modshift } from "../../util/modshift.ts"
import {
  type TextEditorTheme,
  themeExtension,
  themeRegistry,
} from "../themes/themes.ts"
import { customElement, noShadowDOM } from "solid-element"

export interface BaseEditorOpts {
  parent?: HTMLElement
  shadow?: ShadowRoot
  content?: string
  theme?: TextEditorTheme | string
  language?: Extension
}

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
    run(view) {
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
    run(view) {
      const s = view.state.selection.main.head
      const le = view.lineBlockAt(s).to
      navigator.clipboard.writeText(view.state.sliceDoc(s, le))
      deleteToLineEnd(view)
      return true
    },
  },
] satisfies KeyBinding[]

export default class TextEditor {
  // keymap = new Compartment()
  // extensions = new Compartment()
  language = new Compartment()
  theme = new Compartment()
  view: EditorView

  constructor(opts: BaseEditorOpts) {
    // todo replace this with some kind of modes system
    // const extensions = this.extensions.of(opts.extensions ?? [])
    // const keys = this.keymap.of(keymap.of(opts.keymap ?? defaultKeyMap))
    const theme = this.theme.of(themeExtension(opts.theme ?? "lychee"))
    const language = this.language.of(opts.language ?? [])
    this.view = new EditorView({
      root: opts.shadow,
      parent: opts.parent,
      doc: opts.content ?? "",
      extensions: [
        search(),
        history(),
        // autocompletion(),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        // todo this all needs configurable via settings
        indentUnit.of("\t"),
        highlightSpecialChars(),
        // highlightTrailingWhitespace(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        // todo also some of it is part of the language like `code`
        lineNumbers(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(2),
        EditorView.clickAddsSelectionRange.of((event) => {
          const mask = modshift(event)
          if (mask == 1 << mod.option) return true
          return false
        }),
        rectangularSelection({
          eventFilter(event) {
            const mask = modshift(event)
            if (mask == ((1 << mod.shift) | (1 << mod.option))) return true
            return false
          },
        }),
        language,
        theme,
      ],
    })
  }
  get element() {
    return this.view.dom
  }

  setLanguage(language: Extension) {
    const effect = this.language.reconfigure(language)
    this.view.dispatch({ effects: effect })
  }

  // getExtensions() {
  //   return this.extensions.get(this.view.state) ?? []
  // }

  // addExtension(ext: Extension) {
  //   const effect = this.extensions.reconfigure([this.getExtensions(), ext])
  //   this.view.dispatch({ effects: effect })
  // }

  // setExtensions(ext: Extension) {
  //   const effect = this.extensions.reconfigure(ext)
  //   this.view.dispatch({ effects: effect })
  // }

  setTheme(theme: TextEditorTheme) {
    const effect = this.theme.reconfigure(themeExtension(theme))
    this.view.dispatch({ effects: effect })
  }
}

// todo worker for this
import * as filesystem from "@tauri-apps/plugin-fs"
import { createEffect, createResource, JSX, Suspense } from "solid-js"
import { lychee } from "../themes/lychee.ts"

themeRegistry.register("lychee", lychee)

customElement("text-editor", { url: undefined }, (props: { url?: URL }) => {
  noShadowDOM()
  const [text] = createResource(
    props.url,
    (url) => filesystem.readTextFile(url),
  )
  return (
    <Suspense>
      {(() => {
        const content = text()
        if (content) {
          const editor = new TextEditor({
            parent: document.createElement("div"),
            content,
          })
          return editor.view.dom
        }
        return null
      }) as unknown as JSX.Element}
    </Suspense>
  )
})
