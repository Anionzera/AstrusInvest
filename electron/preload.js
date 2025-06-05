const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
  platform: process.platform,
});
