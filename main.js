const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  desktopCapturer,
  shell,
  Tray,
  Menu,
  dialog,
  globalShortcut,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
let saveFolder = os.homedir();
let isLargeWindow = false;

// function for capturing screen
async function captureScreen(window) {
  window.hide();
  // Give Windows/Electron a moment to actually hide the app before capture
  await new Promise((resolve) => setTimeout(resolve, 200));
  const screenSize = screen.getPrimaryDisplay().workAreaSize;
  const screens = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: screenSize.width,
      height: screenSize.height,
    },
  });
  const img = screens[0].thumbnail.toPNG();
  //create save location fo screenshot
  const result = await dialog.showOpenDialog(window, {
    title: "Choose screenshot folder",
    defaultPath: os.homedir(),
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    window.show();
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `screenshot-${timestamp}.png`;
  const filePath = path.join(result.filePaths[0], fileName);

  fs.writeFile(filePath, img, (err) => {
    if (err) return console.error(err);
    shell.openExternal(`file://${filePath}`);
  });
}
//is app ready and initialized ? show the app
app.whenReady().then(() => {
  const iconPath = path.join(__dirname, "assets", "camera.ico");
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
      window.setSize(620, 620);
      window.center();
    } else {
      window.setFullScreen(true);
    }

    isLargeWindow = !isLargeWindow;
  });
  // loading html file
  window.loadFile("./index.html");

  // clicking camera icon

  ipcMain.on("capturer-screen", async () => {
    captureScreen(window);
  });
  // creating keyboard shortcut
  const registered = globalShortcut.register("CommandOrControl+Shift+m", () => {
    captureScreen(window);
  });

  if (!registered) {
    console.log("Shortcut registration failed");
  }
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
});
