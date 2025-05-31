const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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
    win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.on('clean-temps', (event, { winTemp, userTemp }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setProgressBar(2); // indeterminate

    const done = () => {
        win.setProgressBar(-1);
        win.webContents.send('cleanup-done');
    };

    let completed = 0;
    const total = [winTemp, userTemp].filter(Boolean).length;

    if (winTemp) {
        const cmd = 'powershell Start-Process cmd.exe -argumentlist \'/c del %temp%\\*.* /s /q & for /d %i in (%temp%\\*) do rd /s /q "%i"\' -Verb Runas';

        exec(cmd, (error) => {
            if (error) console.log('WinTemp error:', error);
            if (++completed === total) done();
        })
    }

    if (userTemp) {
        const cmd = `cmd.exe /c "del %temp%\\*.* /s /q & for /d %i in (%temp%\\*) do rd /s /q "%i""`;
        exec(cmd, (error) => {
            if (error) console.error('UserTemp error:', error);
            if (++completed === total) done();
        });
    }
});

ipcMain.on('clean-cache', (event, browsers) => {
    const browserPaths = {
        chrome: `%localappdata%\\Google\\Chrome\\User Data\\Default\\Cache`,
        edge: `%localappdata%\\Microsoft\\Edge\\User Data\\Default\\Cache`,
        brave: `%localappdata%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `%appdata%\\Mozilla\\Firefox\\Profiles`
    };

    const win = BrowserWindow.getAllWindows()[0];
    win.setProgressBar(2);

    let completed = 0;
    const total = browsers.length;

    browsers.forEach(browser => {
        const cachePath = browserPaths[browser];
        if (!cachePath) return;

        const cmd = browser === 'firefox'
            ? `cmd.exe /c for /d %i in ("${cachePath}\\*") do del /s /q "%i\\cache2\\*.*"`
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
