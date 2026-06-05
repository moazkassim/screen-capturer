const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const defaultSettings = {
  copyToClipboard: false,
  autoOpenScreenshot: true,
  captureFullScreen: false,
  screenshotFormat: "png",
};
let settingsPath;

function loadSettings() {
  settingsPath = path.join(app.getPath("userData"), "settings.json");

  try {
    if (fs.existsSync(settingsPath)) {
      const savedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      return { ...defaultSettings, ...savedSettings };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }

  return { ...defaultSettings };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}
module.exports = {
  defaultSettings,
  loadSettings,
  saveSettings,
};
