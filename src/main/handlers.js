const { BrowserWindow, screen } = require("electron");
const path = require("node:path");

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
  selectionWindow.loadFile(path.join(__dirname, "../selection/selection.html"));

  return selectionWindow;
}
function getImageBuffer(image, settings) {
  if (settings.screenshotFormat === "jpg") {
    return image.toJPEG(90);
  }

  return image.toPNG();
}

function getImageFilter(settings) {
  if (settings.screenshotFormat === "jpg") {
    return {
      name: "JPG Image",
      extensions: ["jpg"],
    };
  }

  return {
    name: "PNG Image",
    extensions: ["png"],
  };
}
module.exports = { createSelectionWindow, getImageBuffer, getImageFilter };
