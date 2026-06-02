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
// async function captureScreen(window) {
//   window.hide();
//   // Give Windows/Electron a moment to actually hide the app before capture
//   await new Promise((resolve) => setTimeout(resolve, 200));
//   const screenSize = screen.getPrimaryDisplay().workAreaSize;
//   const screens = await desktopCapturer.getSources({
//     types: ["screen"],
//     thumbnailSize: {
//       width: screenSize.width,
//       height: screenSize.height,
//     },
//   });
//   const img = screens[0].thumbnail.toPNG();
//   //create save location fo screenshot
//   const result = await dialog.showOpenDialog(window, {
//     title: "Choose screenshot folder",
//     defaultPath: os.homedir(),
//     properties: ["openDirectory"],
//   });

//   if (result.canceled || result.filePaths.length === 0) {
//     window.show();
//     return;
//   }

//   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//   const fileName = `screenshot-${timestamp}.png`;
//   const filePath = path.join(result.filePaths[0], fileName);

//   fs.writeFile(filePath, img, (err) => {
//     if (err) return console.error(err);
//     shell.openExternal(`file://${filePath}`);
//   });
// }

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
  const defaultFileName = `screenshot-${timestamp}.png`;
  const defaultFolder = app.getPath("pictures");
  // let saveFolder;

  const result = await dialog.showSaveDialog(window, {
    title: "Save screenshot",
    defaultPath: path.join(defaultFolder, defaultFileName),
    filters: [
      {
        name: "PNG Image",
        extensions: ["png"],
      },
    ],
  });

  if (result.canceled || !result.filePath) {
    // window.show();
    window.hide();
    return;
  }
  const filePath = result.filePath;

  fs.writeFile(filePath, croppedImage.toPNG(), (err) => {
    //window.show();
    if (err) return console.error(err);
    shell.openExternal(`file://${filePath}`);
  });

  // copy image to clipboard
  clipboard.writeImage(croppedImage);
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
    captureSelectedArea(window);
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
