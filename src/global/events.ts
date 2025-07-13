import { EventEmitter } from "eventemitter3"

export interface LittlebookEvents {
  /** internal stage for settings up registries (things will be missing, unsafe) */
  "lb:early-init": []
  /** internal stage for initializing things with a complete lb  */
  "lb:init": []
  /** user config stage */
  "lb:config": []
}

import { lb } from "./global.tsx"
const events = new EventEmitter<LittlebookEvents>()

declare module "./global.tsx" {
  export interface GlobalExtensions {
    events: typeof events
  }
}

events.once("lb:early-init", () => {
  lb.events = events
})

export default events
