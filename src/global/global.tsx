import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { createStore } from "solid-js/store"
import { mod, modshift } from "../util/modshift.ts"
import "./dock.tsx"
import "./url-handler-registry.ts"
import "./file-editor-registry.ts"
import "../editors/file/file-editor.tsx"
import "../editors/file/text-editor/text-editor.ts"
import { initialWorkingDirectory } from "./cwd.ts"
import events from "./events.ts"
import debug from "./log.ts"
const log = debug.extend("global-init")

// todo move to the insane scoped keymap system i'm going to have to build
// todo this will be part of dockview-mode
addEventListener("keydown", async (event) => {
  const mask = modshift(event)

  if (mask == 1 << mod.super) {
    if (event.key == "o") {
      const file = await open({
        multiple: false,
      })
      if (file) {
        littlebook.dock.open(file)
      }
    }
  }
})

log("loading env vars")
export const [env, updateEnv] = createStore(
  await invoke("initial_environment_variables") as Record<string, string>,
)
log("loaded env vars")

// deno-lint-ignore no-empty-interface
export interface GlobalSettings {}

export const [settings, updateSettings] = createStore<Partial<GlobalSettings>>(
  {},
)

export type PatternPair = [RegExp, string]
export type PatternPairList = PatternPair[]

// these are for extending by plugins

// deno-lint-ignore no-empty-interface
export interface GlobalRegistries {}
// deno-lint-ignore no-empty-interface
export interface GlobalExtensions {}

// todo make this an interface so that it can be extended
class Global {
  // todo a `Panel` api (distinct from dockview panel) that has a `.active` here
  // that's set by any panel tool when their panel is focused (right now there's
  // only dockview but lol why not a tldraw demo)
  // todo that'll also be where minor modes go (and how the text editor gets their extensions)
  // it'll surface:
  // - the workspacer-specific-container
  // - the url handler's name and handler and context
  // - the editor's name and handler and context (such as language in text editor land)
  workingDirectory = initialWorkingDirectory
  registries: GlobalRegistries = {} as GlobalRegistries
  setWorkingDirectory(url: URL) {
    this.workingDirectory = url
  }
  getenv(name: string) {
    return env[name]
  }
  setenv(name: string, value: string) {
    updateEnv(name, value)
  }
  settings = settings
  // todo make dotty get("terminal", "mac-os-alt")
  // todo or drop in favor of just settings.terminal.macOSAlt
  get<K extends keyof GlobalSettings>(key: K): GlobalSettings[K] | undefined {
    return settings[key]
  }
  set = updateSettings
  // todo this should be an extendable interface like the other parts
  util = {
    list: {
      add<T>(list: T[], item: T) {
        const index = list.indexOf(item)
        if (index != -1) {
          ;[list[index], list[0]] = [list[0], list[index]]
        } else {
          list.unshift(item)
        }
      },
      rm<T>(list: T[], item: T) {
        const index = list.indexOf(item)
        if (index > -1) {
          list[index] = list[list.length - 1]
          list.pop()
        }
      },
    },
  }
}

export const littlebook = new Global() as Global & GlobalExtensions
export const lb = littlebook
window.lb = lb
window.littlebook = lb
log("EVENT: early-init")
events.emit("lb:early-init")
log("QUEUE-EVENT: init")
queueMicrotask(() => {
  log("EVENT: init")
  events.emit("lb:init")
  log("QUEUE-EVENT: config")
  queueMicrotask(() => {
    log("EVENT: config")
    events.emit("lb:config")
  })
})

declare global {
  const lb: Global & GlobalExtensions
  const littlebook: Global & GlobalExtensions
  interface Window {
    littlebook: Global & GlobalExtensions
    lb: Global & GlobalExtensions
  }
}
