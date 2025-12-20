use serde::Serialize;
use std::process::Command;
use std::time::Instant;
use tauri::{Emitter, Listener, Manager};

/// Spotify playback state returned to the frontend
#[derive(Serialize, Debug)]
pub struct SpotifyState {
    pub is_running: bool,
    pub is_playing: bool,
    pub track_name: Option<String>,
    pub artist_name: Option<String>,
    pub album_name: Option<String>,
    pub duration_ms: Option<i64>,
    pub position_ms: Option<i64>,
    pub track_id: Option<String>,
    pub fetch_time_ms: u64,  // How long the osascript took
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

/// Check if Spotify is running (quick check via System Events)
fn is_spotify_running() -> bool {
    let script = r#"tell application "System Events" to (name of processes) contains "Spotify""#;
    run_osascript(script)
        .map(|s| s.to_lowercase() == "true")
        .unwrap_or(false)
}

/// Get the current Spotify playback state via a SINGLE osascript call
/// This is much faster than multiple separate calls
#[tauri::command]
async fn get_spotify_state() -> Result<SpotifyState, String> {
    let start = Instant::now();
    
    if !is_spotify_running() {
        let elapsed = start.elapsed().as_millis() as u64;
        return Ok(SpotifyState {
            is_running: false,
            is_playing: false,
            track_name: None,
            artist_name: None,
            album_name: None,
            duration_ms: None,
            position_ms: None,
            track_id: None,
            fetch_time_ms: elapsed,
        });
    }

    // Use a SINGLE osascript call to get all info at once (much faster!)
    let script = r#"
tell application "Spotify"
    if player state is stopped then
        return "stopped|||||||"
    end if
    
    set playerState to player state as string
    set trackName to name of current track
    set artistName to artist of current track
    set albumName to album of current track
    set trackDuration to duration of current track
    set playerPos to player position
    set trackId to id of current track
    
    return playerState & "|" & trackName & "|" & artistName & "|" & albumName & "|" & trackDuration & "|" & playerPos & "|" & trackId
end tell
"#;

    let result = run_osascript(script)?;
    let parts: Vec<&str> = result.split('|').collect();
    
    if parts.len() < 7 || parts[0] == "stopped" {
        let elapsed = start.elapsed().as_millis() as u64;
        return Ok(SpotifyState {
            is_running: true,
            is_playing: false,
            track_name: None,
            artist_name: None,
            album_name: None,
            duration_ms: None,
            position_ms: None,
            track_id: None,
            fetch_time_ms: elapsed,
        });
    }

    let is_playing = parts[0] == "playing";
    let track_name = if parts[1].is_empty() { None } else { Some(parts[1].to_string()) };
    let artist_name = if parts[2].is_empty() { None } else { Some(parts[2].to_string()) };
    let album_name = if parts[3].is_empty() { None } else { Some(parts[3].to_string()) };
    
    // Duration from Spotify is in milliseconds (e.g., 208000 for 3:28)
    let duration_ms = parts[4].parse::<i64>().ok();
    
    // Position is in seconds as a float (e.g., 45.123 or 45,123 depending on locale)
    // Replace comma with dot for locales that use comma as decimal separator
    let position_raw = parts[5].replace(',', ".");
    let position_ms = position_raw.parse::<f64>().ok().map(|s| (s * 1000.0) as i64);
    let track_id = parts[6].split(':').last().map(|s| s.to_string());
    let elapsed = start.elapsed().as_millis() as u64;

    Ok(SpotifyState {
        is_running: true,
        is_playing,
        track_name,
        artist_name,
        album_name,
        duration_ms,
        position_ms,
        track_id,
        fetch_time_ms: elapsed,
    })
}

/// Quick position-only state (much faster than full state)
#[derive(Serialize, Debug)]
pub struct SpotifyPosition {
    pub is_running: bool,
    pub is_playing: bool,
    pub position_ms: Option<i64>,
    pub fetch_time_ms: u64,
}

/// Get just the player position (fast - for frequent polling)
#[tauri::command]
async fn get_spotify_position() -> Result<SpotifyPosition, String> {
    let start = Instant::now();
    
    // Quick script - only gets position and play state
    let script = r#"
tell application "System Events"
    if not (exists process "Spotify") then
        return "not_running||"
    end if
end tell
tell application "Spotify"
    if player state is stopped then
        return "stopped||"
    end if
    set playerState to player state as string
    set playerPos to player position
    return playerState & "|" & playerPos
end tell
"#;

    let result = run_osascript(script)?;
    let elapsed = start.elapsed().as_millis() as u64;
    let parts: Vec<&str> = result.split('|').collect();
    
    if parts[0] == "not_running" {
        return Ok(SpotifyPosition {
            is_running: false,
            is_playing: false,
            position_ms: None,
            fetch_time_ms: elapsed,
        });
    }
    
    if parts[0] == "stopped" || parts.len() < 2 {
        return Ok(SpotifyPosition {
            is_running: true,
            is_playing: false,
            position_ms: None,
            fetch_time_ms: elapsed,
        });
    }
    
    let is_playing = parts[0] == "playing";
    let position_raw = parts[1].replace(',', ".");
    let position_ms = position_raw.parse::<f64>().ok().map(|s| (s * 1000.0) as i64);
    
    Ok(SpotifyPosition {
        is_running: true,
        is_playing,
        position_ms,
        fetch_time_ms: elapsed,
    })
}

/// Toggle fullscreen mode
#[tauri::command]
async fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())?;
    Ok(!is_fullscreen)
}

/// Get current fullscreen state
#[tauri::command]
async fn is_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    window.is_fullscreen().map_err(|e| e.to_string())
}

/// Play/resume Spotify playback
#[tauri::command]
async fn spotify_play() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to play"#)?;
    Ok(())
}

/// Pause Spotify playback
#[tauri::command]
async fn spotify_pause() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to pause"#)?;
    Ok(())
}

/// Toggle play/pause
#[tauri::command]
async fn spotify_play_pause() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to playpause"#)?;
    Ok(())
}

/// Skip to next track
#[tauri::command]
async fn spotify_next() -> Result<(), String> {
    run_osascript(r#"tell application "Spotify" to next track"#)?;
    Ok(())
}

/// Go to previous track
#[tauri::command]
async fn spotify_previous() -> Result<(), String> {
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
fn send_to_tauri(_message: String) {
    // Silent - no logging for performance
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
            get_spotify_position,
            toggle_fullscreen,
            is_fullscreen,
            spotify_play,
            spotify_pause,
            spotify_play_pause,
            spotify_next,
            spotify_previous
        ])
        .setup(|app| {
            println!("[Tauri] App starting...");
            
            // Listen for messages from the web page
            let handle = app.handle().clone();
            app.listen("web-to-tauri", move |event| {
                let _ = handle.emit("tauri-to-web", format!("Received: {}", event.payload()));
            });

            // Open devtools in debug mode for easier development
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }

            println!("[Tauri] Ready!");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
