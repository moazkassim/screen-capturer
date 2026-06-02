const { ipcRenderer } = require("electron");

document.getElementById("camera-btn").addEventListener("click", () => {
  ipcRenderer.send("capturer-screen");
});
document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("close-capturer-screen");
});
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  ipcRenderer.send("toggle-fullscreen-size");
});
