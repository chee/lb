import events from "./events.ts"
import type { PatternPair, PatternPairList } from "./global.tsx"

/**
 * it can be a web component's name or a function that returns a dom element
 */
export type URLHandler =
  | (<Props extends { url: URL }>(props?: Props) => Element)
  | string

const urlHandlerRegistry = {
  handlers: new Map<string, URLHandler>(),
  register(
    name: string,
    handler: URLHandler,
  ) {
    if (this.handlers.has(name)) {
      console.warn(`overwriting url handler: "${name}"`)
    }
    this.handlers.set(name, handler)
  },
  get(name: string): URLHandler | undefined {
    return this.handlers.get(name)
  },
  has(name: string): boolean {
    return this.handlers.has(name)
  },
  clear() {
    this.handlers.clear()
  },
  patterns: [] as PatternPairList,
  addPattern(pattern: PatternPair) {
    lb.util.list.add(this.patterns, pattern)
  },
  removePattern(pattern: PatternPair) {
    lb.util.list.rm(this.patterns, pattern)
  },
  match(url: URL | string, defaultTo?: string) {
    if (typeof url != "string") {
      url = url.toString()
    }
    const [, handlerName] =
      this.patterns.find(([regexp]) => regexp.exec(url)) ??
        [, defaultTo]
    if (!handlerName) {
      throw new Error(`no url handler for ${url}`)
    }

    return this.get(handlerName)!
  },
}

declare module "./global.tsx" {
  export interface GlobalRegistries {
    urlHandler: typeof urlHandlerRegistry
  }
}

declare module "./events.ts" {
  interface LittlebookEvents {
    "lb:url-handler-registry:installed": []
  }
}

events.once("lb:early-init", () => {
  lb.registries.urlHandler = urlHandlerRegistry
  events.emit("lb:url-handler-registry:installed")
})
