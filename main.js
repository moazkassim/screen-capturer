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
  clipboard,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
let isLargeWindow = false;

// handling settings
const settingsPath = path.join(app.getPath("userData"), "settings.json");
const defaultSettings = {
  copyToClipboard: false,
  autoOpenScreenshot: true,
  captureFullScreen: false,
  screenshotFormat: "png",
};
let settings = { ...defaultSettings };
function getImageBuffer(image) {
  if (settings.screenshotFormat === "jpg") {
    return image.toJPEG(90);
  }

  if (settings.screenshotFormat === "webp") {
    return image.toPNG(); // Electron NativeImage does not support WebP export directly
  }

  return image.toPNG();
}
function getImageFilter() {
  if (settings.screenshotFormat === "jpg") {
    return {
      name: "JPG Image",
      extensions: ["jpg"],
    };
  }

  if (settings.screenshotFormat === "webp") {
    return {
      name: "WEBP Image",
      extensions: ["webp"],
    };
  }

  return {
    name: "PNG Image",
    extensions: ["png"],
  };
}
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const savedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      settings = { ...defaultSettings, ...savedSettings };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}
ipcMain.on("update-setting", (event, { key, value }) => {
  settings[key] = value;
  saveSettings();
});
ipcMain.handle("get-settings", () => {
  return settings;
});
// function for adding screen select area
function createSelectionWindow() {
  const display = screen.getPrimaryDisplay();
  const selectionWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  selectionWindow.loadFile("./selection.html");

  return selectionWindow;
}

// function for capturing screen
async function captureFullScreen(window) {
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
  //choose file name and path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultFileName = `screenshot-${timestamp}.${settings.screenshotFormat}`;
  const defaultFolder = app.getPath("pictures");
  // let saveFolder;

  const result = await dialog.showSaveDialog(window, {
    title: "Save screenshot",
    defaultPath: path.join(defaultFolder, defaultFileName),
    filters: [getImageFilter()],
  });

  if (result.canceled || !result.filePath) {
    // window.show();
    window.hide();
    return;
  }
  const filePath = result.filePath;

  fs.writeFile(filePath, getImageBuffer(croppedImage), (err) => {
    //window.show();
    if (err) return console.error(err);
    if (settings.autoOpenScreenshot) {
      shell.openExternal(`file://${filePath}`);
    }
  });

  // copy image to clipboard
  if (settings.copyToClipboard) {
    clipboard.writeImage(croppedImage);
  }
}

async function captureSelectedArea(window) {
  window.hide();

  await new Promise((resolve) => setTimeout(resolve, 300));

  const selectionWindow = createSelectionWindow();

  const selectedArea = await new Promise((resolve) => {
    ipcMain.once("area-selected", (event, area) => {
      resolve(area);
    });
  });

  selectionWindow.close();

  if (!selectedArea) {
    window.show();
    return;
  }
  if (selectedArea.width < 5 || selectedArea.height < 5) {
    window.show();
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const display = screen.getPrimaryDisplay();
  const screenSize = display.size;
  const scaleFactor = display.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: screenSize.width * scaleFactor,
      height: screenSize.height * scaleFactor,
    },
  });

  const croppedImage = sources[0].thumbnail.crop({
    x: Math.round(selectedArea.x * scaleFactor),
    y: Math.round(selectedArea.y * scaleFactor),
    width: Math.round(selectedArea.width * scaleFactor),
    height: Math.round(selectedArea.height * scaleFactor),
  });

  //choose file name and path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultFileName = `screenshot-${timestamp}.${settings.screenshotFormat.toLowerCase()}`;
  const defaultFolder = app.getPath("pictures");
  // let saveFolder;

  const result = await dialog.showSaveDialog(window, {
    title: "Save screenshot",
    defaultPath: path.join(defaultFolder, defaultFileName),
    filters: [getImageFilter()],
  });

  if (result.canceled || !result.filePath) {
    // window.show();
    window.hide();
    return;
  }
  const filePath = result.filePath;

  fs.writeFile(filePath, getImageBuffer(croppedImage), (err) => {
    //window.show();
    if (err) return console.error(err);
    if (settings.autoOpenScreenshot) {
      shell.openExternal(`file://${filePath}`);
    }
  });

  // copy image to clipboard
  if (settings.copyToClipboard) {
    clipboard.writeImage(croppedImage);
  }
}

//is app ready and initialized ? show the app
app.whenReady().then(() => {
  loadSettings();
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
      window.setSize(800, 600);
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
    if (settings.captureFullScreen) {
      captureFullScreen(window);
    } else {
      captureSelectedArea(window);
    }
  });
  // creating keyboard shortcut
  const registered = globalShortcut.register("CommandOrControl+Shift+m", () => {
    captureSelectedArea(window);
  });

  if (!registered) {
    console.log("Shortcut registration failed");
  }
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
});
