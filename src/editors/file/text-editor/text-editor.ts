import events from ":global/events.ts"
import "./language-registry.ts"
import { FileEditor } from ":global/file-editor.ts"
import { log as fileEditorLog } from "../file-editor.tsx"
import TextEditor from "./codemirror.ts"
export const log = fileEditorLog.extend("text-editor")

const decoder = new TextDecoder()
const encoder = new TextEncoder()
const textEditor: FileEditor = (props) => {
  const content = decoder.decode(props.bytes)
  const languageName = lb.registries.textEditorLanguage.matchName(props.url)
  console.log({ languageName })
  const language = lb.registries.textEditorLanguage.get(languageName)

  const editor = new TextEditor({
    content,
    language: language?.(props),
  })
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

events.once("lb:text-editor-language-registry:installed", () => {
})
