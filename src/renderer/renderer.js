const { ipcRenderer } = require("electron");
const captureView = document.getElementById("capture-view");
const settingsView = document.getElementById("settings-view");

document.getElementById("camera-btn").addEventListener("click", () => {
  ipcRenderer.send("capturer-screen");
});
document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("close-capturer-screen");
});
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  ipcRenderer.send("toggle-fullscreen-size");
});

// settings

document.getElementById("settings-btn").addEventListener("click", () => {
  captureView.classList.remove("active");
  settingsView.classList.add("active");
});

document.getElementById("done-btn").addEventListener("click", () => {
  settingsView.classList.remove("active");
  captureView.classList.add("active");
});

document
  .getElementById("copy-to-clipboard")
  .addEventListener("change", (event) => {
    ipcRenderer.send("update-setting", {
      key: "copyToClipboard",
      value: event.target.checked,
    });
  });

document
  .getElementById("auto-open-screenshot")
  .addEventListener("change", (event) => {
    ipcRenderer.send("update-setting", {
      key: "autoOpenScreenshot",
      value: event.target.checked,
    });
  });
document
  .getElementById("capture-full-screen")
  .addEventListener("change", (event) => {
    ipcRenderer.send("update-setting", {
      key: "captureFullScreen",
      value: event.target.checked,
    });
  });
document
  .getElementById("screenshot-format")
  .addEventListener("change", (event) => {
    ipcRenderer.send("update-setting", {
      key: "screenshotFormat",
      value: event.target.value,
    });
  });

async function loadSettings() {
  const settings = await ipcRenderer.invoke("get-settings");

  document.getElementById("copy-to-clipboard").checked =
    settings.copyToClipboard;

  document.getElementById("auto-open-screenshot").checked =
    settings.autoOpenScreenshot;
  document.getElementById("capture-full-screen").checked =
    settings.captureFullScreen;
  document.getElementById("screenshot-format").value =
    settings.screenshotFormat === "jpg" ? "jpg" : "png";
}

loadSettings();
