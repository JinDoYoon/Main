const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { create } = require('domain');

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

app.whenReady().then(() => {
    const args = process.argv.slice(1);
    if (args.includes('-temp')) {
        
    }
    else if (args.includes('-cache')) {

    }

    else if (args.includes('-both')) {

    }

    else createWindow();
});

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
        const cmd = 'powershell Start-Process cmd.exe -argumentlist \'/c del C:\\Windows\\Temp\\*.* /s /q "&" for /d %i in (C:\\Windows\\Temp\\*) do rd /s /q "%i"\' -Verb Runas';

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

ipcMain.handle('detect-browsers', async () => {
    const localAppData = process.env.LOCALAPPDATA;

    const browserPaths = {
        edge: `${localAppData}\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data`, // Garbage browser
        chrome: `${localAppData}\\Google\\Chrome\\User Data\\`,
        brave: `${localAppData}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `${localAppData}\\Mozilla\\Firefox\\Profiles\\`,
        // opera: 
        // whale: 
    };

    const result = {};

    for (const [key, path] of Object.entries(browserPaths)) {
        if (fs.existsSync(path)) {
            result[key] = true;
        }
    }

    return result;
});


ipcMain.on('clean-cache', (event, browsers) => {
    const browserPaths = {
        edge: `%localappdata%\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data`, // stupid bloatware
        chrome: `%localappdata%\\Google\\Chrome\\User Data\\Profile 1\\Cache\\Cache_Data`,
        brave: `%localappdata%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `%localappdata%\\Mozilla\\Firefox\\Profiles`,
        // opera: ``
        // whale: ``
    };

    const win = BrowserWindow.getAllWindows()[0];
    win.setProgressBar(2);

    let completed = 0;
    const total = browsers.length;

    browsers.forEach(browser => {
        const cachePath = browserPaths[browser];
        if (!cachePath) return;

        const cmd = browser === 'firefox'
            ? `cmd.exe /c for /d %i in ("${cachePath}\\*") do del /s /q "%i\\cache2\\entries\\*.*"`
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

ipcMain.on('reserve', (event, cache, temp, date, time) => {
    if (temp && cache) {
        const cmd = `powershell Start-Process schtasks.exe -argumentlist '/create /tn "execute" /tr "%localappdata%\Programs\main\PC Optimization Helper.exe -both" /st ${time} /sd ${date} /sc once /rl highest' -Verb Runas`
    }
    else if (temp) {
        const cmd = `powershell Start-Process schtasks.exe -argumentlist '/create /tn "execute" /tr "%localappdata%\Programs\main\PC Optimization Helper.exe -temp" /st ${time} /sd ${date} /sc once /rl highest' -Verb Runas`
    }
    else if (cache) {
        const cmd = `powershell Start-Process schtasks.exe -argumentlist '/create /tn "execute" /tr "%localappdata%\Programs\main\PC Optimization Helper.exe -cache" /st ${time} /sd ${date} /sc once /rl highest' -Verb Runas`
    }

    exec(cmd, (error) => {
        if (error) {
            console.error('Error reserving space:', error);
        }
    });
});