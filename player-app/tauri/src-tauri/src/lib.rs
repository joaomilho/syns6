use serde::Serialize;
use std::process::{Command, Child};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::thread;
use std::fs::OpenOptions;
use std::io::Write;
use tauri::{Emitter, Listener, Manager};

/// Global handle to the sidecar process for cleanup
static SIDECAR_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

/// Log to a file in the user's home directory for debugging
fn log_to_file(message: &str) {
    if let Some(home) = std::env::var_os("HOME") {
        let log_path = std::path::PathBuf::from(home).join("syns6-debug.log");
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(file, "[{}] {}", timestamp, message);
        }
    }
    println!("{}", message);
}

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

/// Check if Spotify is running using pgrep (faster than osascript)
fn is_spotify_running() -> bool {
    Command::new("pgrep")
        .arg("-x")
        .arg("Spotify")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Open Spotify app and play a specific track by ID (hidden/headless)
fn open_spotify_with_track(track_id: &str) {
    // Launch Spotify, hide it, then play - runs "headless"
    let script = format!(
        r#"
tell application "Spotify"
    launch
end tell

-- Wait for Spotify to be ready
delay 1

-- Hide Spotify so it runs in background
tell application "System Events"
    set visible of process "Spotify" to false
end tell

-- Now play the track
tell application "Spotify"
    play track "spotify:track:{}"
end tell
"#,
        track_id
    );
    let _ = run_osascript(&script);
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
    
    // Fast check using pgrep instead of osascript
    if !is_spotify_running() {
        let elapsed = start.elapsed().as_millis() as u64;
        return Ok(SpotifyPosition {
            is_running: false,
            is_playing: false,
            position_ms: None,
            fetch_time_ms: elapsed,
        });
    }
    
    // Quick script - only gets position and play state
    let script = r#"
tell application "Spotify"
    if player state is stopped then
        return "stopped|"
    end if
    set playerState to player state as string
    set playerPos to player position
    return playerState & "|" & playerPos
end tell
"#;

    let result = run_osascript(script)?;
    let elapsed = start.elapsed().as_millis() as u64;
    let parts: Vec<&str> = result.split('|').collect();
    
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

/// Called by frontend when UI is ready - ensures Spotify is running
#[tauri::command]
async fn on_ui_ready() -> Result<bool, String> {
    if !is_spotify_running() {
        println!("[Tauri] Spotify not running, opening with default track...");
        open_spotify_with_track("3V8nBJQ29jLhnOytk8xqSz"); // Special K by BLP KOSHER
        Ok(true) // Spotify was opened
    } else {
        println!("[Tauri] Spotify already running");
        Ok(false) // Spotify was already running
    }
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

/// Check if the server is ready by polling localhost:3000
fn wait_for_server_ready(timeout_secs: u64) -> bool {
    let start = Instant::now();
    let timeout = Duration::from_secs(timeout_secs);
    
    log_to_file("[Tauri] Waiting for server to be ready...");
    
    while start.elapsed() < timeout {
        // Try to connect to the server
        if let Ok(output) = Command::new("curl")
            .args(["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3000/player"])
            .output()
        {
            let status = String::from_utf8_lossy(&output.stdout);
            if status.starts_with("2") || status.starts_with("3") {
                log_to_file(&format!("[Tauri] Server ready! ({}ms)", start.elapsed().as_millis()));
                return true;
            }
        }
        thread::sleep(Duration::from_millis(200));
    }
    
    log_to_file(&format!("[Tauri] Server timeout after {}s", timeout_secs));
    false
}

/// Spawn the Node.js sidecar to run the Next.js server
fn spawn_server_sidecar(app: &tauri::App) -> Result<(), String> {
    log_to_file("[Tauri] spawn_server_sidecar called");
    
    let resource_path = app.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?;
    
    log_to_file(&format!("[Tauri] Resource path: {:?}", resource_path));
    
    // Resources are bundled into a "resources" subdirectory
    let resources_subdir = resource_path.join("resources");
    let server_dir = resources_subdir.join("server");
    let start_script = server_dir.join("start.js");
    
    // Determine the sidecar binary name based on platform (must match Tauri target triple)
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    let sidecar_name = "node-sidecar-aarch64-apple-darwin";
    
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    let sidecar_name = "node-sidecar-x86_64-apple-darwin";
    
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    let sidecar_name = "node-sidecar-aarch64-unknown-linux-gnu";
    
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    let sidecar_name = "node-sidecar-x86_64-unknown-linux-gnu";
    
    #[cfg(target_os = "windows")]
    let sidecar_name = "node-sidecar-x86_64-pc-windows-msvc.exe";
    
    let node_binary = resources_subdir.join(sidecar_name);
    
    log_to_file(&format!("[Tauri] Node binary: {:?}", node_binary));
    log_to_file(&format!("[Tauri] Start script: {:?}", start_script));
    log_to_file(&format!("[Tauri] Server dir: {:?}", server_dir));
    
    // List contents of resources subdirectory
    if let Ok(entries) = std::fs::read_dir(&resources_subdir) {
        log_to_file("[Tauri] Resources subdir contents:");
        for entry in entries.flatten() {
            log_to_file(&format!("  - {:?}", entry.path()));
        }
    } else {
        log_to_file(&format!("[Tauri] Cannot read resources subdir: {:?}", resources_subdir));
    }
    
    if !node_binary.exists() {
        let err = format!("Node binary not found: {:?}", node_binary);
        log_to_file(&err);
        return Err(err);
    }
    
    if !start_script.exists() {
        let err = format!("Start script not found: {:?}", start_script);
        log_to_file(&err);
        return Err(err);
    }
    
    log_to_file("[Tauri] Spawning Node process...");
    
    // Create log file for Node output
    let node_log_path = std::env::var_os("HOME")
        .map(|h| std::path::PathBuf::from(h).join("syns6-node.log"))
        .unwrap_or_else(|| std::path::PathBuf::from("/tmp/syns6-node.log"));
    
    let node_log = std::fs::File::create(&node_log_path)
        .map_err(|e| format!("Failed to create node log: {}", e))?;
    let node_log_err = node_log.try_clone()
        .map_err(|e| format!("Failed to clone log handle: {}", e))?;
    
    log_to_file(&format!("[Tauri] Node log: {:?}", node_log_path));
    
    // Spawn the Node process with output redirected to log
    let child = Command::new(&node_binary)
        .arg(&start_script)
        .current_dir(&server_dir)
        .env("NODE_ENV", "production")
        .env("PORT", "3000")
        .env("HOSTNAME", "127.0.0.1")
        .stdout(std::process::Stdio::from(node_log))
        .stderr(std::process::Stdio::from(node_log_err))
        .spawn()
        .map_err(|e| {
            let err = format!("Failed to spawn sidecar: {}", e);
            log_to_file(&err);
            err
        })?;
    
    // Store the child process for cleanup
    if let Ok(mut guard) = SIDECAR_PROCESS.lock() {
        *guard = Some(child);
    }
    
    log_to_file("[Tauri] Sidecar spawned successfully");
    Ok(())
}

/// Kill the sidecar process on exit
fn kill_sidecar() {
    if let Ok(mut guard) = SIDECAR_PROCESS.lock() {
        if let Some(ref mut child) = *guard {
            println!("[Tauri] Killing sidecar process...");
            let _ = child.kill();
            let _ = child.wait();
            println!("[Tauri] Sidecar terminated");
        }
        *guard = None;
    }
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
            spotify_previous,
            on_ui_ready
        ])
        .setup(|app| {
            log_to_file("[Tauri] App starting...");
            
            // Get the main window
            let window = app.get_webview_window("main");
            
            // In production, spawn the sidecar server
            #[cfg(not(debug_assertions))]
            {
                log_to_file("[Tauri] Production mode - starting sidecar server...");
                
                // Show window immediately so user sees something
                if let Some(ref w) = window {
                    let _ = w.show();
                }
                
                // Spawn the Node.js sidecar
                match spawn_server_sidecar(app) {
                    Ok(_) => {
                        log_to_file("[Tauri] Sidecar spawned, waiting for server...");
                        if !wait_for_server_ready(30) {
                            log_to_file("[Tauri] Server failed to start within timeout!");
                            // Navigate to an error page
                            if let Some(ref w) = window {
                                let _ = w.eval("document.body.innerHTML = '<div style=\"display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:system-ui;\"><div style=\"text-align:center;\"><h1>Server Failed to Start</h1><p>The embedded server did not start in time.</p><p>Check ~/syns6-debug.log for details.</p></div></div>';");
                            }
                        }
                    }
                    Err(e) => {
                        log_to_file(&format!("[Tauri] Failed to spawn sidecar: {}", e));
                        // Show error in window
                        if let Some(ref w) = window {
                            let error_html = format!(
                                "document.body.innerHTML = '<div style=\"display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:system-ui;\"><div style=\"text-align:center;\"><h1>Startup Error</h1><p>{}</p><p>Check ~/syns6-debug.log for details.</p></div></div>';",
                                e.replace("'", "\\'")
                            );
                            let _ = w.eval(&error_html);
                        }
                    }
                }
            }
            
            // In dev mode, just show the window (server is external)
            #[cfg(debug_assertions)]
            if let Some(ref w) = window {
                w.open_devtools();
                let _ = w.show();
            }
            
            // Listen for messages from the web page
            let handle = app.handle().clone();
            app.listen("web-to-tauri", move |event| {
                let _ = handle.emit("tauri-to-web", format!("Received: {}", event.payload()));
            });

            println!("[Tauri] Ready!");
            Ok(())
        })
        .on_window_event(|_window, event| {
            // Kill sidecar when app is closed
            if let tauri::WindowEvent::Destroyed = event {
                kill_sidecar();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
