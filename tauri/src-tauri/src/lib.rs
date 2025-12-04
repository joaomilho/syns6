use tauri::{Emitter, Listener, Manager};

/// Command to send a message to the webview (Tauri → Web)
/// Call this from Rust to emit an event the webpage can listen to
#[tauri::command]
fn send_to_web(app: tauri::AppHandle, message: String) -> Result<(), String> {
    app.emit("tauri-to-web", message)
        .map_err(|e| e.to_string())
}

/// Command callable from the webpage to send messages to Tauri (Web → Tauri)
#[tauri::command]
fn send_to_tauri(message: String) {
    println!("[Web → Tauri] Received message: {}", message);
    // Handle the message here - you can add your own logic
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![send_to_web, send_to_tauri])
        .setup(|app| {
            // Listen for messages from the web page
            let handle = app.handle().clone();
            app.listen("web-to-tauri", move |event| {
                println!("[Web → Tauri] Event received: {:?}", event.payload());
                // You can emit back to web or handle the message here
                let _ = handle.emit("tauri-to-web", format!("Received: {}", event.payload()));
            });

            // Open devtools in debug mode for easier development
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
