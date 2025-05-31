const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileAPI', {
    cleanTemps: (options) => ipcRenderer.send('clean-temps', options),
    cleanCache: (browsers) => ipcRenderer.send('clean-cache', browsers),
    onDone: (callback) => ipcRenderer.once('cleanup-done', callback),
    detectBrowsers: () => ipcRenderer.invoke('detect-browsers')
});
