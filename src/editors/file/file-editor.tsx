// todo this could really be in the same file as the file editor registry
import events from ":global/events.ts"
import debug from ":global/log.ts"

import { customElement, noShadowDOM } from "solid-element"
import { createResource, Suspense } from "solid-js"

export const log = debug.extend("file-editor")

// todo this stuff needs be hidden behind a function that either uses tauri (if window.__TAURI__) or a web worker
// we'll transfer the uint8array from there
// that way we can unplug tauri and plug in firefox
import * as filesystem from "@tauri-apps/plugin-fs"

/* this doesn't really _need_ to be a web component, (or a solidjs component for that matter) but it's kind of sick to be able to just create an html element and inject it into the page with a url and have it magically work right ?*/
customElement(
  "file-editor",
  { url: new URL("about:blank") },
  (props: { url: URL }) => {
    noShadowDOM()
    // todo if it doesn't exist, offer to make it!
    // console.log(props.url)
    // todo store the mtime etc so we can safely not-save and ask the user if they're sure if it's been edited outside since they last looked
    // const [stat] = createResource(
    // () => props.url,
    // (url) => filesystem.stat(url),
    // )
    const [bytes] = createResource(
      () => props.url,
      (url) => filesystem.readFile(url),
    )
    const editorName = lb.registries.fileEditor.matchName(props.url)
    const editor = lb.registries.fileEditor.get(editorName!)
    log(`editor for ${props.url} is ${editorName}`)
    if (!editor) {
      console.warn(`editor not found ${editor}`)
      return <div>imagine there was a useful error message here</div>
    }
    return (
      <Suspense>
        {editor({
          url: props.url,
          bytes: bytes() ?? new Uint8Array(),
          async save(newBytes: Uint8Array) {
            await filesystem.writeFile(props.url, newBytes)
          },
        })}
      </Suspense>
    )
  },
)

events.once("lb:url-handler-registry:installed", () => {
  log("registering file url handler")
  lb.registries.urlHandler.register("file-editor", "file-editor")
  lb.registries.urlHandler.addPattern([/^file:/, "file-editor"])
  log("registered file url handler")
})
