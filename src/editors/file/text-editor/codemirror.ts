import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  KeyBinding,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view"
import {
  highlightSelectionMatches,
  search,
  searchKeymap,
} from "@codemirror/search"

import { indentUnit } from "@codemirror/language"
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
import {
  Compartment,
  EditorState,
  type Extension,
  type Text,
} from "@codemirror/state"
import theme from "./theme.ts"
import { mod, modshift } from "../../../util/modshift.ts"

export interface TextEditorOpts {
  content?: string | Text
  state?: EditorState
  language?: Extension
  parent?: HTMLElement
  shadow?: ShadowRoot
  extensions?: Extension
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
  extensions = new Compartment()
  language = new Compartment()
  view: EditorView
  constructor(opts: TextEditorOpts) {
    // todo replace this with some kind of modes system
    const extensions = this.extensions.of(opts.extensions ?? [])
    // const keys = this.keymap.of(keymap.of(opts.keymap ?? defaultKeyMap))

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
        extensions,
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

  getExtensions() {
    return this.extensions.get(this.view.state) ?? []
  }

  // addExtension(ext: Extension) {
  //   const effect = this.extensions.reconfigure([this.getExtensions(), ext])
  //   this.view.dispatch({ effects: effect })
  // }

  setExtensions(ext: Extension) {
    const effect = this.extensions.reconfigure(ext)
    this.view.dispatch({ effects: effect })
  }

  // setTheme(theme: TextEditorTheme) {
  //   const effect = this.theme.reconfigure(themeExtension(theme))
  //   this.view.dispatch({ effects: effect })
  // }
}

// customElement("text-editor", { url: undefined }, (props: { url?: URL }) => {
//   noShadowDOM()
//   const [text] = createResource(
//     props.url,
//     (url) => filesystem.readTextFile(url),
//   )
//   return (
//     <Suspense>
//       {(() => {
//         const content = text()
//         if (content) {
//           const editor = new TextEditor({
//             parent: document.createElement("div"),
//             content,
//           })
//           return editor.view.dom
//         }
//         return null
//       }) as unknown as JSX.Element}
//     </Suspense>
//   )
// })
