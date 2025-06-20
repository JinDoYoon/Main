const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const { create } = require('domain');
// const regedit = require('regedit');
const path = require('path');
const fs = require('fs');
const logPath = `${process.env.USERPROFILE}\\Cleaning.log`;

function log(message) {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
}

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
    // win.webContents.openDevTools();
}

function Temp(options) {
    const { winTemp, userTemp } = options;
    const win = BrowserWindow.getAllWindows()[0];
    const total = [winTemp, userTemp].filter(Boolean).length;
    const done = () => {
        win.setProgressBar(-1);
        win.webContents.send('cleanup-done');
    };

    win.setProgressBar(2); // indeterminate
    let completed = 0;

    if (winTemp) {
        const cmd = 'powershell Start-Process cmd.exe -argumentlist \'/c del C:\\Windows\\Temp\\*.* /s /q "&" for /d %i in (C:\\Windows\\Temp\\*) do rd /s /q "%i"\' -Verb Runas';

        exec(cmd, (error) => {
            if (error) log('WinTemp error:', error);
            if (++completed === total) done();
        });
    }

    if (userTemp) {
        const cmd = `cmd.exe /c "del %temp%\\*.* /s /q & for /d %i in (%temp%\\*) do rd /s /q "%i""`;
        exec(cmd, (error) => {
            if (error) log('UserTemp error:', error);
            if (++completed === total) done();
        });
    }
}

function reservedTemp(options) {
    const { winTemp, userTemp } = options;
    const temppath = process.env.TMP;

    if (winTemp) {
        const cmd = 'cmd.exe /c del C:\\Windows\\Temp\\*.* /s /q & for /d %i in (C:\\Windows\\Temp\\*) do rd /s /q "%i"';

        exec(cmd, (error) => {
            if (error) log('WinTemp error:', error);
        });
    }

    if (userTemp) {
        const cmd = `cmd.exe /c "del ${temppath}\\*.* /s /q & for /d %i in (${temppath}\\*) do rd /s /q "%i""`;

        exec(cmd, (error) => {
            if (error) log('UserTemp error:', error);
        });
    }
}

const detect = async () => {
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
}

function Cache(browser) {
    const localAppData = process.env.LOCALAPPDATA;
    const browserPaths = {
        edge: `${localAppData}\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data`, // stupid bloatware
        chrome: `${localAppData}\\Google\\Chrome\\User Data\\Profile 1\\Cache\\Cache_Data`,
        brave: `${localAppData}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `${localAppData}\\Mozilla\\Firefox\\Profiles`,
        // opera: ``
        // whale: ``
    };
    const cachePath = browserPaths[browser];

    if (!cachePath) return;

    const cmd = browser === 'firefox'
        ? `cmd.exe /c for /d %i in ("${cachePath}\\*") do del /s /q "%i\\cache2\\entries\\*.*"`
        : `cmd.exe /c del "${cachePath}\\*.*" /s /q`;

    exec(cmd, (error) => {
        if (error) log(`Error cleaning ${browser} cache:`, error);
    });
}

function reservedCache(browser) {
    const localAppData = process.env.LOCALAPPDATA;
    const browserPaths = {
        edge: `${localAppData}\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data`,
        chrome: `${localAppData}\\Google\\Chrome\\User Data\\Profile 1\\Cache\\Cache_Data`,
        brave: `${localAppData}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache`,
        firefox: `${localAppData}\\Mozilla\\Firefox\\Profiles`,
    };
    const cachePath = browserPaths[browser];

    if (!cachePath) return;

    const cmd = browser === 'firefox'
        ? `cmd.exe /c for /d %i in ("${cachePath}\\*") do del "%i\\cache2\\entries\\*.*" /s /q`
        : `cmd.exe /c del "${cachePath}\\*.*" /s /q`;

    exec(cmd, (error) => {
        if (error) log(`Error cleaning ${browser} cache:`, error);
    });
}

async function YesOrNo(title, message) {
    const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 1,
        cancelId:0,
        title: title,
        message: message
    })
    return result.response
}

ipcMain.on('clean-cache', (event, browsers) => {
    browsers.forEach(browser => Cache(browser));
});

ipcMain.handle('detect-browsers', async () => {
    const detected = await detect();
    return detected;
});

ipcMain.on('clean-temps', (event, { winTemp, userTemp }) => {
    Temp({ winTemp, userTemp });
});

ipcMain.on('reserve', (event, cache, temp, date, time) => {
    function schtasksdate(inputDate) {
        const [year, month, day] = inputDate.split("-");
        return `${month}/${day}/${year}`;
    }

    const TempPath = `"''C:\\Program Files\\PC Optimization Helper\\PC Optimization Helper.exe'' -temp"`;
    const CachePath = `"''C:\\Program Files\\PC Optimization Helper\\PC Optimization Helper.exe'' -cache"`;
    const BothPath = `"''C:\\Program Files\\PC Optimization Helper\\PC Optimization Helper.exe'' -both"`;
    let cmd = '';
    let dates = schtasksdate(date);

    if (temp && cache) {
        const schtasksPath = `\\"${BothPath}\\"`;
        cmd = `powershell -Command "Start-Process cmd -ArgumentList '/k', 'schtasks /delete /tn \\"Test\\" /f & schtasks /create /tn \\"Test\\" /tr ${schtasksPath} /st ${time} /sd ${dates} /sc once /rl highest /f' -Verb RunAs"`;
    } else if (temp) {
        const schtasksPath = `\\"${TempPath}\\"`;
        cmd = `powershell -Command "Start-Process cmd -ArgumentList '/k', 'schtasks /delete /tn \\"Test\\" /f & schtasks /create /tn \\"Test\\" /tr ${schtasksPath} /st ${time} /sd ${dates} /sc once /rl highest /f' -Verb RunAs"`;
    } else if (cache) {
        const schtasksPath = `\\"${CachePath}\\"`;
        cmd = `powershell -Command "Start-Process cmd -ArgumentList '/k', 'schtasks /delete /tn \\"Test\\" /f & schtasks /create /tn \\"Test\\" /tr ${schtasksPath} /st ${time} /sd ${dates} /sc once /rl highest /f' -Verb RunAs"`;
    }

    exec(cmd, (error) => {
        if (error) log(error);
    });
});

ipcMain.on('reboot', async () => {
    const result = await YesOrNo('다시 시작', '지금 시스템을 다시 시작하시겠습니까?');

    if (!result) {
        log('Rebooting system...');
        exec('shutdown /r /t 0', (error) => {
            if (error) log('Reboot error:', error);
        });
    }
});

ipcMain.on('apply-settings', (event, Startup, AutoRestart) => {

});

app.whenReady().then(async () => {
    const args = process.argv.slice(1);

    if (args.includes('-temp')) {
        reservedTemp({ winTemp: true, userTemp: true });
        setTimeout(() => app.exit(0), 5000);
    }

    else if (args.includes('-cache')) {
        const detected = await detect();
        const browsers = Object.keys(detected).filter(key => detected[key]);
        // Clean cache for all detected browsers
        browsers.forEach(browser => reservedCache(browser));
        setTimeout(() => app.exit(0), 5000);
    }

    else if (args.includes('-both')) {
        reservedTemp({ winTemp: true, userTemp: true });
        const detected = await detect();
        const browsers = Object.keys(detected).filter(key => detected[key]);
        browsers.forEach(browser => reservedCache(browser));
        setTimeout(() => app.exit(0), 5000);
    }

    else createWindow();
});