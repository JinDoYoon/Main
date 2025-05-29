const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sudo = require('sudo-prompt');

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

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sudo = require('sudo-prompt');

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
    win.setProgressBar(2); // Indeterminate progress

    const done = () => {
        win.setProgressBar(-1); // Remove progress bar
        win.webContents.send('cleanup-done');
    };

    let completed = 0;
    const total = [winTemp, userTemp].filter(Boolean).length;

    // Helper to track task completion
    const markDone = () => {
        completed++;
        if (completed === total) done();
    };

    // Cleanup Windows Temp with elevation
    if (winTemp) {
        const command = `powershell -NoProfile -Command "Remove-Item -Path 'C:\\Windows\\Temp\\*' -Recurse -Force -ErrorAction SilentlyContinue"`;
        sudo.exec(command, { name: 'Electron Temp Cleaner' }, (error, stdout, stderr) => {
            if (error) console.error('Windows Temp error:', error);
            if (stderr) console.error('Windows Temp stderr:', stderr);
            markDone();
        });
    }

    // Cleanup User Temp with elevation
    if (userTemp && userTempPath) {
        const command = `powershell -NoProfile -Command "Remove-Item -Path '${userTempPath}\\*' -Recurse -Force -ErrorAction SilentlyContinue"`;
        sudo.exec(command, { name: 'Electron Temp Cleaner' }, (error, stdout, stderr) => {
            if (error) console.error('User Temp error:', error);
            if (stderr) console.error('User Temp stderr:', stderr);
            markDone();
        });
    }
});
