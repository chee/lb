import * as Dockview from "dockview-core"
import "./dockview.css"
import { initialWorkingDirectory } from "./cwd.ts"
import { createDynamic, render } from "solid-js/web"
import events from "./events.ts"
import debug from "./log.ts"
const log = debug.extend("dock")

type PanelMaker = Dockview.DockviewFrameworkOptions["createComponent"]

const dockviewLayoutKey = () => `dockview:${initialWorkingDirectory}`

const dynamicPanel: PanelMaker = (opts) => {
  const element = document.createElement("pass-thru")
  let destroy: () => void
  return {
    element,
    init({ api, params }) {
      log(`initializing "${params.title}"`)
      params.id = opts.id
      const component = createDynamic(
        () => params.component,
        params.props,
      )
      destroy = render(() => component, element)
      setTimeout(() => {
        api.setTitle(params.title)
        localStorage.setItem(
          dockviewLayoutKey(),
          JSON.stringify(dockview.toJSON()),
        )
      })
    },
    layout() {
      element.firstElementChild?.dispatchEvent(
        new CustomEvent("lb:layout"),
      )
    },
    focus() {
      element.firstElementChild?.dispatchEvent(
        new CustomEvent("lb:focus"),
      )
    },
    dispose() {
      element.firstElementChild?.dispatchEvent(
        new CustomEvent("lb:cleanup"),
      )
      destroy()
      setTimeout(() => {
        localStorage.setItem(
          dockviewLayoutKey(),
          JSON.stringify(dockview.toJSON()),
        )
      })
    },
    update(event: Dockview.Parameters) {
      element.firstElementChild?.dispatchEvent(
        new CustomEvent("lb:update", { detail: event }),
      )
    },
  }
}

function open(
  url: URL | string,
  opts?: { position?: "left" | "right" | "above" | "below" | "within" },
) {
  if (typeof url == "string") {
    url = new URL(url, lb.workingDirectory)
  }
  console.log("opening", { url })
  const urlHandlerComponent = lb.registries.urlHandler.match(url)
  console.log({ urlHandlerComponent })
  const pathparts = url.pathname.split("/")
  const end = pathparts[pathparts.length - 1]
  dockview
    .addPanel({
      id: Math.random().toString(36).slice(2),
      component: "dynamic",
      renderer: "always",
      title: end,
      // tabComponent: "file",
      position: {
        direction: opts?.position ??
          lb.settings?.panels?.defaults?.position ?? "right",
      },
      params: {
        title: end,
        component: urlHandlerComponent,
        props: { url },
      },
    })
}
// todo this sort of thing wrapped up somehow
// this pattern seems perfect for standalone views like play-tetris
// todo decide if the `component` part should be the web component's name
// or something like `standlone` with a param for the component name
// then can have `component: "file"` kind of thing too...
// maybe this is already good enough, though? webs as the language
// they could also register themselves as a protocol like new URL("tetris:")
function term() {
  dockview.addPanel({
    id: Math.random().toString(36).slice(2),
    component: "dynamic",
    renderer: "always",
    position: {
      direction: "right",
    },
    params: {
      title: "terminal",
      component: "x-term",
      props: {
        cwd: lb.workingDirectory,
      },
    },
  })
}

export const panelHandlers: Record<
  string,
  Dockview.DockviewFrameworkOptions["createComponent"]
> = {
  "dynamic": dynamicPanel,
}

const dockview = Dockview.createDockview(
  document.querySelector("main-view")!,
  {
    theme: {
      name: "littlebook",
      className: "dockview-theme-littlebook",
      gap: 0,
      dndPanelOverlay: "group",
      dndOverlayMounting: "relative",
    },
    singleTabMode: "fullwidth",
    createComponent(opts) {
      const handler = panelHandlers[opts.name]
      if (!handler) {
        throw new Error(`no panel handler for ${opts.name}`)
      }
      return handler(opts)
    },
    createTabComponent() {
      return {
        element: document.createElement("div"),
        init() {},
      }
    },
  },
)

const stored = localStorage.getItem(dockviewLayoutKey())

export interface PanelsSettings {
  defaults: {
    position: Dockview.Direction
  }
}

declare module "./global.tsx" {
  export interface GlobalSettings {
    panels: PanelsSettings
  }
  export interface GlobalExtensions {
    dock: {
      _dockview: typeof dockview
      open: typeof open
      term: typeof term
    }
  }
}

events.once("lb:early-init", () => {
  lb.dock = { _dockview: dockview, open, term }
  lb.set("panels", {
    defaults: {
      position: "right",
    },
  })
})

events.once("lb:init", () => {
  // todo per project rather than per cwd?
  if (stored) {
    try {
      dockview.fromJSON(JSON.parse(stored, (key, value) => {
        if (typeof value == "string") {
          try {
            // todo benchmark against checking if it matches a url regex first
            return new URL(value)
          } catch {}
        }
        return value
      }))
    } catch {}
  }
})
