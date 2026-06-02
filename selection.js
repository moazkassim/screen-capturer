const { ipcRenderer } = require("electron");

const selectionBox = document.getElementById("selection-box");

let startX = 0;
let startY = 0;
let isSelecting = false;

window.addEventListener("mousedown", (event) => {
  isSelecting = true;

  startX = event.clientX;
  startY = event.clientY;

  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;
  selectionBox.style.width = "0px";
  selectionBox.style.height = "0px";
  selectionBox.style.display = "block";
});

window.addEventListener("mousemove", (event) => {
  if (!isSelecting) return;

  const currentX = event.clientX;
  const currentY = event.clientY;

  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selectionBox.style.left = `${x}px`;
  selectionBox.style.top = `${y}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
});

window.addEventListener("mouseup", (event) => {
  if (!isSelecting) return;

  isSelecting = false;

  const endX = event.clientX;
  const endY = event.clientY;

  const area = {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };

  ipcRenderer.send("area-selected", area);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    ipcRenderer.send("area-selected", null);
  }
});
