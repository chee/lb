import "./terminal.css"
import {Terminal as Xterm} from "@xterm/xterm"
import {spawn} from "tauri-pty/dist/index.es.js"
import {FitAddon} from "@xterm/addon-fit"
import {CanvasAddon} from "@xterm/addon-canvas"
import {
	environmentVariables,
	registerPackage,
	Surface,
	View,
	workingDirectory,
} from "littlebook"

class Terminal implements View {
	surface: Surface
	constructor(surface: Surface) {
		this.surface = surface
	}
	mount(element: HTMLElement) {
		const css = getComputedStyle(element)
		const url = this.surface.url ? new URL(this.surface.url) : workingDirectory
		const cwd = url.pathname
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
		element.addEventListener("resize", refit)
		xterm.open(element)
		const pty = spawn(
			url.searchParams.get("shell") || pkg.settings.defaultShell,
			[],
			{
				cwd,
				cols: xterm.cols,
				rows: xterm.rows,
				env: {
					TERM: "xterm-256color",
					...environmentVariables,
				},
			}
		)
		pty.onData(data => xterm.write(data))
		xterm.onData(data => pty.write(data))
		return () => {
			removeEventListener("resize", refit)
			element.removeEventListener("resize", refit)
			pty.kill()
			xterm.dispose()
		}
	}
}

var pkg = registerPackage({
	name: "terminal",
	protocols: {},
	settings: {
		optionIsMeta: true as boolean,
		defaultShell: "zsh" as string,
	},
	views: {Terminal},
})
