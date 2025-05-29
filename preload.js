const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileAPI', {
    cleanTemps: (options) => ipcRenderer.send('clean-temps', options),
    onDone: (callback) => ipcRenderer.once('cleanup-done', callback)
});
