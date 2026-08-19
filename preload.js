const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dsh', {
  status: () => ipcRenderer.invoke('dsh:status'),
  start: () => ipcRenderer.invoke('dsh:start'),
  restart: () => ipcRenderer.invoke('dsh:restart'),
  openBrowser: () => ipcRenderer.invoke('dsh:openBrowser'),
  onReady: (cb) => ipcRenderer.on('dsh:ready', (_e, ok) => cb(ok)),
});
