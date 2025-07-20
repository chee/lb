declare interface Window {
	__TAURI__: typeof import("@tauri-apps/api") & {
		fs: typeof import("@tauri-apps/plugin-fs")
	}
}
