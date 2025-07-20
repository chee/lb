use tauri::path::BaseDirectory;
use tauri::{Manager, TitleBarStyle};
use tauri::{Url, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn find_parent_dir_containing(start_url: String, target_files: Vec<String>) -> Option<Url> {
    let url = Url::parse(&start_url).ok()?;
    let start_path = url.to_file_path().ok()?;

    let mut current = start_path.as_path();

    loop {
        for file in &target_files {
            if current.join(file).exists() {
                return Url::from_file_path(current).ok();
            }
        }
        current = current.parent()?;
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn initial_working_directory() -> Url {
    let path = std::env::current_dir().unwrap_or(".".into());
    Url::from_directory_path(path).unwrap()
}

#[tauri::command]
fn initial_environment_variables() -> std::collections::HashMap<String, String> {
    std::env::vars().collect()
}

#[tauri::command]
fn install(handle: tauri::AppHandle, system_directory: String, user_directory: String) -> Option<bool> {
    use std::fs;

    let system_resource_path = handle.path().resolve("system", BaseDirectory::Resource).ok()?;

    println!("Installing system resources from: {}, to: {}", system_resource_path.display(), system_directory);

    // Create system directory if it doesn't exist
    if !fs::metadata(&system_directory).is_ok() {
        if let Err(e) = fs::create_dir_all(&system_directory) {
            eprintln!("Failed to create system directory: {}", e);
            return None;
        }
    }

    // Create user directory if it doesn't exist
    if !fs::metadata(&user_directory).is_ok() {
        if let Err(e) = fs::create_dir_all(&user_directory) {
            eprintln!("Failed to create user directory: {}", e);
            return None;
        }
    }

    // recursively copy all files from system_resource_path to system_directory
    if let Err(e) = fs::copy(system_resource_path, &system_directory) {
        eprintln!("Failed to copy system resources: {}", e);
        return None;
    }

    Some(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_cache::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_websocket::init())
        // .plugin(tauri_plugin_stronghold::Builder::new(|pass| todo!()).build())
        .plugin(tauri_plugin_store::Builder::new().build())
        // .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("littlebook.")
                .disable_drag_drop_handler()
                .inner_size(1024., 768.);

            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
            let window = win_builder.build().unwrap();

            #[cfg(target_os = "macos")]
            #[allow(deprecated)]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                unsafe {
                    let ns_window = window.ns_window().unwrap() as id;
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(nil, 0.0, 0.0, 0.0, 1.0);
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            Ok(())
        })
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            initial_working_directory,
            initial_environment_variables,
            find_parent_dir_containing,
            install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
