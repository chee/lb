declare interface Window {
	__TAURI__: typeof import("@tauri-apps/api") & {
		dialog: typeof import("@tauri-apps/plugin-dialog")
		fs: typeof import("@tauri-apps/plugin-fs")
	}
}
c
