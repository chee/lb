import "./terminal.css"
import {Terminal as Xterm} from "@xterm/xterm"
import {spawn} from "tauri-pty/dist/index.es.js"
import {FitAddon} from "@xterm/addon-fit"
import {CanvasAddon} from "@xterm/addon-canvas"
import {registerPackage, Surface, View} from "littlebook"

// todo what if views extended HTMLElement
class Terminal extends HTMLElement implements View<"noop"> {
	type: "noop"
	constructor() {
		super()
	}
	mount(surface: Surface<"noop">, element: HTMLElement) {
		const css = getComputedStyle(element)
		const workingDirectory = surface.workingDirectory
		const xterm = new Xterm({
			convertEol: true,
			windowsMode: false,
			allowProposedApi: true,
			allowTransparency: true,
			cursorBlink: true,
			altClickMovesCursor: true,
			macOptionIsMeta: pkg.settings.optionIsMeta,
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
			pty.kill()
			xterm.dispose()
		})
	}
}

var pkg = registerPackage({
	name: "terminal",
	settings: {
		optionIsMeta: true as boolean,
		defaultShell: "zsh" as string,
	},
	views: {Terminal},
})
