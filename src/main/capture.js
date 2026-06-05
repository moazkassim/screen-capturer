const {
  app,
  ipcMain,
  screen,
  desktopCapturer,
  shell,
  dialog,
  clipboard,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { getImageBuffer, getImageFilter } = require("./handlers");

async function getScreenshotFilePath(window, settings) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotFormat = settings.screenshotFormat === "jpg" ? "jpg" : "png";
  const defaultFileName = `screenshot-${timestamp}.${screenshotFormat}`;
  const defaultFolder = app.getPath("pictures");

  const result = await dialog.showSaveDialog(window, {
    title: "Save screenshot",
    defaultPath: path.join(defaultFolder, defaultFileName),
    filters: [getImageFilter(settings)],
  });

  if (result.canceled || !result.filePath) return null;

  return result.filePath;
}

function saveScreenshot(filePath, image, settings) {
  fs.writeFile(filePath, getImageBuffer(image, settings), (err) => {
    if (err) return console.error(err);

    if (settings.autoOpenScreenshot) {
      shell.openExternal(`file://${filePath}`);
    }
  });

  if (settings.copyToClipboard) {
    clipboard.writeImage(image);
  }
}

async function captureFullScreen(window, settings) {
  window.hide();

  await new Promise((resolve) => setTimeout(resolve, 200));

  const screenSize = screen.getPrimaryDisplay().workAreaSize;
  const screens = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: screenSize.width,
      height: screenSize.height,
    },
  });

  const image = screens[0].thumbnail;
  const filePath = await getScreenshotFilePath(window, settings);

  if (!filePath) {
    window.show();
    return;
  }

  saveScreenshot(filePath, image, settings);
}

async function captureSelectedArea(window, settings, createSelectionWindow) {
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

  const filePath = await getScreenshotFilePath(window, settings);

  if (!filePath) {
    window.show();
    return;
  }

  saveScreenshot(filePath, croppedImage, settings);
}
module.exports = {
  captureFullScreen,
  captureSelectedArea,
};
