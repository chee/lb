// import "./terminal.css"
// import "xterm/css/xterm.css"
import {Terminal as Xterm} from "https://esm.sh/@xterm/xterm"
import {spawn} from "https://esm.sh/tauri-pty/dist/index.es.js"
import {FitAddon} from "https://esm.sh/@xterm/addon-fit"
import {CanvasAddon} from "https://esm.sh/@xterm/addon-canvas"
import {onCleanup, onMount, createComponent} from "https://esm.sh/solid-js"
import {customElement, noShadowDOM} from "https://esm.sh/solid-element"
lb.style(import.meta.resolve("./terminal.css"))
lb.style("https://esm.sh/@xterm/xterm/css/xterm.css")

/* todo:
 * - pass theme in
 * - pass font in
 *
 */
/**
 * @param {{ cwd?: URL | string; shell?: string; env?: Record<string, string> }} props
 * @returns {any}
 */
export default function Terminal(props) {
	const terminal = document.createElement("figure")
	const css = getComputedStyle(terminal)
	onMount(() => {
		const xterm = new Xterm({
			// todo expose as settings
			convertEol: true,
			windowsMode: false,
			allowProposedApi: true,
			allowTransparency: true,
			cursorBlink: true,
			altClickMovesCursor: true,
			// todo etc
			macOptionIsMeta: lb.get("terminal-option-is-meta") ?? true,
			// todo get from settings
			theme: {
				background: css.getPropertyValue("--terminal-fill"),
				foreground: css.getPropertyValue("--terminal-line"),
				selectionBackground: css.getPropertyValue("--terminal-selection-fill"),
				selectionInactiveBackground: css.getPropertyValue(
					"--terminal-selection-fill--inactive"
				),
				selectionForeground: css.getPropertyValue("--terminal-selection-line"),
				cursor: css.getPropertyValue("--terminal-cursor-fill"),
			},
			fontFamily: css.getPropertyValue("--terminal-family"),
			fontSize: parseInt(css.getPropertyValue("--terminal-font-size")) || 16,
		})
		const canvasAddon = new CanvasAddon()
		xterm.loadAddon(canvasAddon)
		const fit = new FitAddon()
		const refit = fit.fit.bind(fit)
		xterm.loadAddon(fit)
		refit()
		addEventListener("resize", refit)
		terminal.parentElement?.addEventListener("lb:layout", refit)
		xterm.open(terminal)
		// todo this seems reüsable
		let cwd = props.cwd
		if (typeof cwd == "string") {
			if (cwd.startsWith("file:")) {
				cwd = new URL(cwd)
			}
		}
		if (cwd instanceof URL) {
			cwd = cwd.pathname
		}
		const pty = spawn(props.shell ?? "zsh", [], {
			cwd,
			cols: xterm.cols,
			rows: xterm.rows,
			env: {
				TERM: "xterm-256color",
				...props.env,
			},
		})
		pty.onData(data => xterm.write(data))
		xterm.onData(data => pty.write(data))
		onCleanup(() => {
			removeEventListener("resize", refit)
			terminal.removeEventListener("resize", refit)
			terminal.parentElement?.addEventListener("lb:layout", refit)
			pty.kill()
			xterm.dispose()
		})
	})
	return terminal
}
customElement(
	"x-term",
	{
		cwd: undefined,
		shell: undefined,
		env: undefined,
	},
	props => {
		noShadowDOM()
		return createComponent(Terminal, props)
	}
)
