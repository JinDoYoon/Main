// Holy yaps here!
const StartScreen = document.querySelector('.StartScreen');
const SelectScreen = document.querySelector('.SelectScreen');
const TempOptions = document.querySelector('.TempOptions');
const CacheOptions = document.querySelector('.CacheOptions');
const ReserveOptions = document.querySelector('.ReserveOptions');
const Reserved = document.querySelector('.Reserved');
const InProgress = document.querySelector('.Progressing');
const Finished = document.querySelector('.Done');
const Settings = document.querySelector('.Settings');

const main = document.querySelector('.main');
const settings = document.querySelector('.settings');
const previous = document.querySelector('.previous');

let last = SelectScreen;

// Screen Switching
function changeWindow(oldwin, newwin) {
    oldwin.classList.remove('visible');
    oldwin.classList.add('invisible');
    newwin.classList.remove('invisible');
    newwin.classList.add('visible');
    last = oldwin;
}

// Deja vu
function backfrom(v) {
    changeWindow(v, last);
}

// Clean the junks
function cleantemp() {
    const isWinTemp = document.getElementById('all').checked;
    const isUserTemp = document.getElementById('current').checked;

    if (!isWinTemp && !isUserTemp) {
        alert('적어도 하나의 항목은 선택하셔야 합니다.');
        return;
    }

    changeWindow(TempOptions, InProgress);
    document.getElementById('progress-bar').classList.add('indeterminate');

    window.fileAPI.cleanTemps({
        winTemp: isWinTemp,
        userTemp: isUserTemp
    });

    window.fileAPI.onDone(() => {
        document.getElementById('progress-bar').classList.remove('indeterminate');
        changeWindow(InProgress, Finished);
    });
}

// Detects Browser (I have no idea why this is not a function but it works so whatever)
window.fileAPI.detectBrowsers().then(detected => {
    const container = document.querySelector('.BrowserOptions');
    container.innerHTML = '';

    for (const browser of Object.keys(detected)) {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.innerHTML = `
            <input type="checkbox" id="${browser}"> ${browser[0].toUpperCase() + browser.slice(1)}
        `;
        container.appendChild(label);
    }
});

// Gets the info from the non function above and sends something to main
function cleanBrowserCaches() {
    const supported = ['chrome', 'edge', 'brave', 'firefox'];
    const selected = supported.filter(id => {
        const checkbox = document.getElementById(id);
        return checkbox?.checked;
    });

    if (selected.length === 0) {
        alert('At least one browser must be selected!');
        return;
    }

    changeWindow(CacheOptions, InProgress);
    document.getElementById('progress-bar').classList.add('indeterminate');

    window.fileAPI.cleanCache(selected);

    window.fileAPI.onDone(() => {
        document.getElementById('progress-bar').classList.remove('indeterminate');
        changeWindow(InProgress, Finished);
    });
}

// Reserving
function reserve(cacheChecked, tempChecked, date, time) {
    if (!cacheChecked && !tempChecked) {
        alert('At least one option must be selected!');
        return;
    }
    window.fileAPI.reserve(cacheChecked, tempChecked, date, time);
}

// Trying to exit
function requestExit() {
    const isMain = document.getElementById('gomain').checked;
    const reboot = document.getElementById('reboot').checked;

    if (isMain) {
        changeWindow(Finished, SelectScreen);
    }
    if (reboot) {
        window.fileAPI.reboot();
    }
}

function changeSettings(Startup, Autorestart) {
    window.fileAPI.changeSettings(Startup, Autorestart);
}