const StartScreen = document.querySelector('.StartScreen'); // Start Screen
const SelectScreen = document.querySelector('.SelectScreen'); // Select Screen
const TempOptions = document.querySelector('.TempOptions'); // Tempfile options
const CacheOptions = document.querySelector('.CacheOptions'); // Cache options
const ReserveOptions = document.querySelector('.ReserveOptions'); // Reserve options
const InProgress = document.querySelector('.Progressing'); // In Progress
const Finished = document.querySelector('.Done'); // Finished
const Settings = document.querySelector('.Settings'); // Settings

// const temp = document.querySelector('.temp'); // chosen temp file
// const cache = document.querySelector('.cache'); // chosen cache file
// const reserve = document.querySelector('.reserve'); // chosen to cleanup later

const main = document.querySelector('.main'); // Sidebar #1 (Go to SelectScreen)
const settings = document.querySelector('.settings'); // Sidebar #2 (Go to Settings)
const previous = document.querySelector('.previous'); // sidebar #3 (Go to previous screen)

function changeWindow(oldwin, newwin) {
    oldwin.classList.remove('visible');
    oldwin.classList.add('invisible');
    newwin.classList.remove('invisible');
    newwin.classList.add('visible');
}

function exit() {
    window.close();
}