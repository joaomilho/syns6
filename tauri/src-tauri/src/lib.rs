use serde::Serialize;
use std::process::Command;
use tauri::{Emitter, Listener, Manager};

/// Spotify playback state returned to the frontend
#[derive(Serialize)]
pub struct SpotifyState {
    pub is_running: bool,
    pub is_playing: bool,
    pub track_name: Option<String>,
    pub artist_name: Option<String>,
    pub album_name: Option<String>,
    pub duration_ms: Option<i64>,
    pub position_ms: Option<i64>,
    pub track_id: Option<String>,
}

/// Execute an osascript command and return the output
fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to execute osascript: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("osascript error: {}", stderr))
    }
}

/// Check if Spotify is running
fn is_spotify_running() -> bool {
    let script = r#"tell application "System Events" to (name of processes) contains "Spotify""#;
    run_osascript(script)
        .map(|s| s.to_lowercase() == "true")
        .unwrap_or(false)
}

/// Get the current Spotify playback state via osascript
#[tauri::command]
fn get_spotify_state() -> Result<SpotifyState, String> {
    // First check if Spotify is running
    if !is_spotify_running() {
        return Ok(SpotifyState {
            is_running: false,
            is_playing: false,
            track_name: None,
            artist_name: None,
            album_name: None,
            duration_ms: None,
            position_ms: None,
            track_id: None,
        });
    }

    // Get player state (playing/paused/stopped)
    let player_state_script = r#"tell application "Spotify" to player state as string"#;
    let player_state = run_osascript(player_state_script)?;
    let is_playing = player_state == "playing";

    // If not playing anything, return minimal state
    if player_state == "stopped" {
        return Ok(SpotifyState {
            is_running: true,
            is_playing: false,
            track_name: None,
            artist_name: None,
            album_name: None,
            duration_ms: None,
            position_ms: None,
            track_id: None,
        });
    }

    // Get track info - using separate calls for reliability
    let track_name = run_osascript(r#"tell application "Spotify" to name of current track"#).ok();
    let artist_name = run_osascript(r#"tell application "Spotify" to artist of current track"#).ok();
    let album_name = run_osascript(r#"tell application "Spotify" to album of current track"#).ok();
    
    // Duration is in seconds, convert to ms
    let duration_ms = run_osascript(r#"tell application "Spotify" to duration of current track"#)
        .ok()
        .and_then(|s| s.parse::<i64>().ok());
    
    // Player position is in seconds, convert to ms
    let position_ms = run_osascript(r#"tell application "Spotify" to player position"#)
        .ok()
        .and_then(|s| s.parse::<f64>().ok())
        .map(|s| (s * 1000.0) as i64);

    // Get track ID from spotify URI (format: spotify:track:XXXX)
    let track_id = run_osascript(r#"tell application "Spotify" to id of current track"#)
        .ok()
        .and_then(|uri| {
            // URI format: spotify:track:1234567890
            uri.split(':').last().map(|s| s.to_string())
        });

    Ok(SpotifyState {
        is_running: true,
        is_playing,
        track_name,
        artist_name,
        album_name,
        duration_ms,
        position_ms,
        track_id,
    })
}

/// Play/resume Spotify playback
#[tauri::command]
fn spotify_play() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to play"#)?;
    Ok(())
}

/// Pause Spotify playback
#[tauri::command]
fn spotify_pause() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to pause"#)?;
    Ok(())
}

/// Toggle play/pause
#[tauri::command]
fn spotify_play_pause() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to playpause"#)?;
    Ok(())
}

/// Skip to next track
#[tauri::command]
fn spotify_next() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to next track"#)?;
    Ok(())
}

/// Go to previous track
#[tauri::command]
fn spotify_previous() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to previous track"#)?;
    Ok(())
}

/// Command to send a message to the webview (Tauri → Web)
#[tauri::command]
fn send_to_web(app: tauri::AppHandle, message: String) -> Result<(), String> {
    app.emit("tauri-to-web", message)
        .map_err(|e| e.to_string())
}

/// Command callable from the webpage to send messages to Tauri (Web → Tauri)
#[tauri::command]
fn send_to_tauri(message: String) {
    println!("[Web → Tauri] Received message: {}", message);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            send_to_web,
            send_to_tauri,
            get_spotify_state,
            spotify_play,
            spotify_pause,
            spotify_play_pause,
            spotify_next,
            spotify_previous
        ])
        .setup(|app| {
            // Listen for messages from the web page
            let handle = app.handle().clone();
            app.listen("web-to-tauri", move |event| {
                println!("[Web → Tauri] Event received: {:?}", event.payload());
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
