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

// Screen Switching
function changeWindow(oldwin, newwin) {
    oldwin.classList.remove('visible');
    oldwin.classList.add('invisible');
    newwin.classList.remove('invisible');
    newwin.classList.add('visible');
}

// App Exit
function exit() {
    window.close();
}

function cleantemp() {
    const winTempChecked = document.getElementById('all').checked;
    const userTempChecked = document.getElementById('current').checked;

    if (!winTempChecked && !userTempChecked) {
        alert('적어도 하나의 항목은 선택하셔야 합니다.');
        return;
    }

    changeWindow(TempOptions, InProgress);
    document.getElementById('progress-bar').classList.add('indeterminate');

    window.fileAPI.cleanTemps({
        winTemp: winTempChecked,
        userTemp: userTempChecked,
        userTempPath: process.env.TEMP
    });

    window.fileAPI.onDone(() => {
        document.getElementById('progress-bar').classList.remove('indeterminate');
        changeWindow(InProgress, Finished);
    });
}