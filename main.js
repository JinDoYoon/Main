const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sudo = require('sudo-prompt');
const { exec } = require('child_process');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1080,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('clean-temps', (event, { winTemp, userTemp, userTempPath }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setProgressBar(2); // indeterminate

    const done = () => {
        win.setProgressBar(-1);
        win.webContents.send('cleanup-done');
    };

    let completed = 0;
    const total = [winTemp, userTemp].filter(Boolean).length;

    if (winTemp) {
        const cmd = `cmd.exe /c del C:\\Windows\\Temp\\*.* /s /q`;
        sudo.exec(cmd, { name: 'Electron Cleaner' }, (error) => {
            if (error) console.error('WinTemp error:', error);
            if (++completed === total) done();
        });
    }

    if (userTemp) {
        const cmd = `cmd.exe /c del "${userTempPath}\\*.*" /s /q`;
        exec(cmd, (error) => {
            if (error) console.error('UserTemp error:', error);
            if (++completed === total) done();
        });
    }
});

ipcMain.on('clean-cache', (event, browsers) => {
    const browserPaths = {
        chrome: `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data\\Default\\Cache`,
        edge: `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\User Data\\Default\\Cache`,
        brave: `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `${process.env.APPDATA}\\Mozilla\\Firefox\\Profiles`
    };

    const win = BrowserWindow.getAllWindows()[0];
    win.setProgressBar(2);

    let completed = 0;
    const total = browsers.length;

    browsers.forEach(browser => {
        const cachePath = browserPaths[browser];
        if (!cachePath) return;

        const cmd = browser === 'firefox'
            ? `for /d %i in ("${cachePath}\\*") do del /s /q "%i\\cache2\\*.*"`
            : `cmd.exe /c del "${cachePath}\\*.*" /s /q`;

        exec(cmd, (error) => {
            if (error) console.error(`Error cleaning ${browser} cache:`, error);
            if (++completed === total) {
                win.setProgressBar(-1);
                win.webContents.send('cleanup-done');
            }
        });
    });
});
