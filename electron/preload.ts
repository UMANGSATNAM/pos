import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getHWID: () => ipcRenderer.invoke('get-hwid')
});
