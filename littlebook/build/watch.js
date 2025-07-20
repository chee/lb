import context, {machineContext} from "./context.js"
;(await context({})).watch()
;(await machineContext).watch()
