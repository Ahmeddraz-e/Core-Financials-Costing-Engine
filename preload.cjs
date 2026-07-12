const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectBackupFile: () => ipcRenderer.invoke('dialog:selectBackupFile'),
});
