const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  globalShortcut,
} = require("electron");
const path = require("node:path");
const { defaultSettings, loadSettings, saveSettings } = require("./settings");
const { captureFullScreen, captureSelectedArea } = require("./capture");
const { createSelectionWindow } = require("./handlers");
let isLargeWindow = false;
let settings = { ...defaultSettings };

ipcMain.on("update-setting", (event, { key, value }) => {
  settings[key] = value;
  saveSettings(settings);
});
ipcMain.handle("get-settings", () => {
  return settings;
});
// // function for adding screen select area
// function createSelectionWindow() {
//   const display = screen.getPrimaryDisplay();
//   const selectionWindow = new BrowserWindow({
//     x: display.bounds.x,
//     y: display.bounds.y,
//     width: display.bounds.width,
//     height: display.bounds.height,
//     frame: false,
//     transparent: true,
//     fullscreen: true,
//     alwaysOnTop: true,
//     skipTaskbar: true,
//     resizable: false,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   });
//   selectionWindow.loadFile(path.join(__dirname, "../selection/selection.html"));

//   return selectionWindow;
// }

// function for capturing screen

//is app ready and initialized ? show the app
app.whenReady().then(() => {
  settings = loadSettings();
  const iconPath = path.join(__dirname, "../assets", "camera.ico");
  const tray = new Tray(iconPath);
  const window = new BrowserWindow({
    webPreferences: { contextIsolation: false, nodeIntegration: true },
    frame: false,
    transparent: true,
    show: false,
  });

  // toggle app visibility
  tray.on("click", () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
    }
  });

  // menu template schema
  const menuTemplate = [
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ];
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);

  // clicking exit button
  ipcMain.on("close-capturer-screen", () => {
    if (!window.isDestroyed()) window.hide();
  });
  // fullscreen size
  ipcMain.on("toggle-fullscreen-size", () => {
    if (isLargeWindow) {
      window.setFullScreen(false);
      window.setSize(800, 600);
      window.center();
    } else {
      window.setFullScreen(true);
    }

    isLargeWindow = !isLargeWindow;
  });
  // loading html file
  window.loadFile(path.join(__dirname, "../renderer/index.html"));

  // clicking camera icon

  ipcMain.on("capturer-screen", async () => {
    if (settings.captureFullScreen) {
      captureFullScreen(window, settings);
    } else {
      captureSelectedArea(window, settings, createSelectionWindow);
    }
  });
  // creating keyboard shortcut
  const shortcut = "CommandOrControl+Alt+S";

  const registered = globalShortcut.register(shortcut, () => {
    if (settings.captureFullScreen) {
      captureFullScreen(window, settings);
    } else {
      captureSelectedArea(window, settings, createSelectionWindow);
    }
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
});
