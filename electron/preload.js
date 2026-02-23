const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getFiles: () => ipcRenderer.invoke('get-files'),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  saveFile: (path, content) => ipcRenderer.invoke('save-file', { filePath: path, content }),
  saveAs: (content) => ipcRenderer.invoke('save-as', content),
  openWorkspace: (path) => ipcRenderer.invoke('open-folder', path),
  runTerminal: (cmd) => ipcRenderer.invoke('run-terminal', cmd),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
});
