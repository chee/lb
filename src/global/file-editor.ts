import events from "./events.ts"
import type { PatternPair, PatternPairList } from "./global.tsx"
import debug from ":global/log.ts"
const log = debug.extend("file-editor-registry")

export type FileEditor = (props: { url: URL; bytes: Uint8Array }) => Element

export const fileEditorRegistry = {
  editors: new Map<string, FileEditor>(),
  register(name: string, editor: FileEditor) {
    if (this.editors.has(name)) {
      console.warn(`overwriting file editor: "${name}"`)
    }
    this.editors.set(name, editor)
  },
  get(name: string): FileEditor | undefined {
    return this.editors.get(name)
  },
  has(name: string): boolean {
    return this.editors.has(name)
  },
  clear() {
    this.editors.clear()
  },
  patterns: [] as PatternPairList,
  addPattern(pattern: PatternPair) {
    lb.util.list.add(this.patterns, pattern)
  },
  removePattern(pattern: PatternPair) {
    lb.util.list.rm(this.patterns, pattern)
  },
  matchName(url: URL | string, defaultTo = lb.settings.fileEditor?.default) {
    if (typeof url != "string") {
      // if the URL contains instructions on what file-editor to use, use that
      if (url.searchParams.has("file-editor")) {
        return url.searchParams.get("file-editor") ?? defaultTo
      }
      url = url.pathname
    }
    const [, handlerName] =
      this.patterns.find(([regexp]) => regexp.exec(url)) ??
        [, defaultTo]

    return handlerName
  },
  match(url: URL | string, defaultTo = lb.settings.fileEditor?.default) {
    const handlerName = this.matchName(url, defaultTo)
    if (!handlerName) {
      throw new Error(`no url handler for ${url}. falling back to ${defaultTo}`)
    }
    return this.get(handlerName)
  },
}

declare module ":global/global.tsx" {
  export interface GlobalRegistries {
    fileEditor: typeof fileEditorRegistry
  }
  export interface GlobalSettings {
    "fileEditor": {
      "default": string
    }
  }
}

declare module ":global/events.ts" {
  interface LittlebookEvents {
    "lb:file-editor-registry:installed": []
  }
}

events.once("lb:early-init", () => {
  lb.registries.fileEditor = fileEditorRegistry
  // todo is this the right place for this?
  lb.set("fileEditor", { default: "text" })
  log("installed")
  events.emit("lb:file-editor-registry:installed")
})
