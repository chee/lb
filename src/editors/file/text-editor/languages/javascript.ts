import events from ":global/events.ts"

import { javascript } from "@codemirror/lang-javascript"
import debug from ":global/log.ts"
const log = debug.extend("javascript-language")

events.once("lb:text-editor-language-registry:installed", () => {
  log("installing JavaScript language module. todo is this a user concern?")
  lb.registries.textEditorLanguage.register("javascript", (props) => {
    return {
      name: "javascript",
      extension: [javascript({
        jsx: props.url.pathname.endsWith("x"),
        typescript: props.url.pathname.startsWith("t"),
      })],
    }
  })
  log("adding pattern")
  lb.registries.textEditorLanguage.addPattern([/\.[tj]sx?$/, "javascript"])
})
