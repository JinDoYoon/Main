const { contextBridge, ipcRenderer } = require('electron');

// If I rename one of these, it would malfunction. Istg don't)
contextBridge.exposeInMainWorld('fileAPI', {
    cleanTemps: (options) => ipcRenderer.send('clean-temps', options),
    cleanCache: (browsers) => ipcRenderer.send('clean-cache', browsers),
    onDone: (callback) => ipcRenderer.once('cleanup-done', callback),
    detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
    reserve: (cache, temp, date, time) => ipcRenderer.send('reserve', cache, temp, date, time),
    reboot: () => ipcRenderer.send('reboot')
});