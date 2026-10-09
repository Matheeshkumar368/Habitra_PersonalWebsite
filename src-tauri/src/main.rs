// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
  CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
  WindowEvent,
};

fn build_tray_menu() -> SystemTrayMenu {
  let open = CustomMenuItem::new("open".to_string(), "Open Habitra");
  let progress = CustomMenuItem::new("progress".to_string(), "Today's Progress");
  let start_focus = CustomMenuItem::new("start_focus".to_string(), "Start Focus Timer");
  let pause_notif = CustomMenuItem::new("pause_notif".to_string(), "Pause Notifications");
  let resume_notif = CustomMenuItem::new("resume_notif".to_string(), "Resume Notifications");
  let lock = CustomMenuItem::new("lock".to_string(), "Lock Habitra");
  let settings = CustomMenuItem::new("settings".to_string(), "Settings");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit Habitra");

  SystemTrayMenu::new()
    .add_item(open)
    .add_item(progress)
    .add_item(start_focus)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(pause_notif)
    .add_item(resume_notif)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(lock)
    .add_item(settings)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(quit)
}

fn main() {
  let system_tray = SystemTray::new().with_menu(build_tray_menu());

  tauri::Builder::default()
    .system_tray(system_tray)
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::LeftClick { .. } => {
        if let Some(window) = app.get_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
      SystemTrayEvent::MenuItemClick { id, .. } => {
        if let Some(window) = app.get_window("main") {
          match id.as_str() {
            "open" => {
              let _ = window.show();
              let _ = window.set_focus();
              let _ = window.emit("habitra-tray-action", "open");
            }
            "progress" => {
              let _ = window.show();
              let _ = window.set_focus();
              let _ = window.emit("habitra-tray-action", "progress");
            }
            "start_focus" => {
              let _ = window.emit("habitra-tray-action", "start_focus");
            }
            "pause_notif" => {
              let _ = window.emit("habitra-tray-action", "pause_notif");
            }
            "resume_notif" => {
              let _ = window.emit("habitra-tray-action", "resume_notif");
            }
            "lock" => {
              let _ = window.show();
              let _ = window.emit("habitra-tray-action", "lock");
            }
            "settings" => {
              let _ = window.show();
              let _ = window.set_focus();
              let _ = window.emit("habitra-tray-action", "settings");
            }
            "quit" => {
              std::process::exit(0);
            }
            _ => {}
          }
        }
      }
      _ => {}
    })
    .on_window_event(|event| {
      if let WindowEvent::CloseRequested { api, .. } = event.event() {
        // Minimize to Windows system tray instead of terminating background scheduler
        let _ = event.window().hide();
        api.prevent_close();
        let _ = event.window().emit("habitra-minimized-to-tray", true);
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running Habitra desktop application");
}
