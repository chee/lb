import { Extension } from "@codemirror/state"
import type { PatternPair, PatternPairList } from ":global/global.tsx"
import events from ":global/events.ts"
import debug from ":global/log.ts"
const log = debug.extend("text-editor-language-registry")
import "./languages/languages.ts"

export type TextEditorLanguage = (props: { url: URL }) => Extension

export const textEditorLanguageRegistry = {
  languages: new Map<string, TextEditorLanguage>(),
  register(name: string, language: TextEditorLanguage) {
    if (this.languages.has(name)) {
      console.warn(`overwriting text editor language: "${name}"`)
    }
    this.languages.set(name, language)
  },
  get(name: string): TextEditorLanguage | undefined {
    return this.languages.get(name)
  },
  has(name: string): boolean {
    return this.languages.has(name)
  },
  clear() {
    this.languages.clear()
  },
  patterns: [] as PatternPairList,
  addPattern(pattern: PatternPair) {
    lb.util.list.add(this.patterns, pattern)
    // todo i think it's right for this to be automatic, but is it?
    // maybe a higher level lb.registerTextLanguage(name, lang) that does both?
    lb.registries.fileEditor.addPattern([pattern[0], "text"])
  },
  removePattern(pattern: PatternPair) {
    lb.util.list.rm(this.patterns, pattern)
  },
  // todo make this fallback a setting like in the file editor
  matchName(url: URL | string, defaultTo = "plain") {
    if (typeof url != "string") {
      if (url.searchParams.has("text-editor-language")) {
        return url.searchParams.get("text-editor-language")! ??
          defaultTo
      }
      url = url.toString()
    }
    const [, handlerName] =
      this.patterns.find(([regexp]) => regexp.exec(url)) ??
        [, defaultTo]
    return handlerName
  },
  // todo make this fallback a setting like in the file editor
  match(url: URL | string, defaultTo = "plain") {
    const handlerName = this.matchName(url, defaultTo)
    if (!handlerName) {
      throw new Error(`no url handler for ${url}`)
    }
    return this.get(handlerName)!
  },
}

textEditorLanguageRegistry.register(
  "plain",
  () => [],
)

declare module ":global/global.tsx" {
  export interface GlobalRegistries {
    textEditorLanguage: typeof textEditorLanguageRegistry
  }
}

declare module ":global/events.ts" {
  interface LittlebookEvents {
    "lb:text-editor-language-registry:installed": []
  }
}

events.once("lb:early-init", () => {
  lb.registries.textEditorLanguage = textEditorLanguageRegistry
  log("installed")
  events.emit("lb:text-editor-language-registry:installed")
})

events.once("lb:file-editor-registry:installed", () => {})
