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
    win.setProgressBar(2); // Indeterminate

    const done = () => {
        win.setProgressBar(-1); // Remove taskbar progress
        win.webContents.send('cleanup-done');
    };

    let completed = 0;
    const total = [winTemp, userTemp].filter(Boolean).length;

    if (winTemp) {
        const script = `powershell -NoProfile -Command "Get-ChildItem 'C:\\Windows\\Temp' -Force | Remove-Item -Recurse -Force"`;
        sudo.exec(script, { name: 'Electron Temp Cleaner' }, () => {
            if (++completed === total) done();
        });
    }

    if (userTemp) {
        try {
            const files = fs.readdirSync(userTempPath);
            files.forEach(entry => {
                const fullPath = path.join(userTempPath, entry);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(fullPath);
                }
            });
        } catch {}
        if (++completed === total) done();
    }
});
