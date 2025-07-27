import { AppRegistry, AppState, NativeModules } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// 1️⃣ Register the headless task that the native service will invoke.
//    The string here ("BackgroundTask") must match what you used in
//    MyHeadlessService.getTaskConfig(...)
AppRegistry.registerHeadlessTask('BackgroundTask', () => async (data) => {
    console.log('🛠️  BackgroundTask JS running', data);
    // … put your WebSocket or other background logic here …
    // e.g.:
    // const ws = new WebSocket('wss://your-server');
    // ws.onopen = () => console.log('WS open in headless');
    // …
    // Keep this promise open so JS stays alive:
    await new Promise(() => { });
});

// 2️⃣ Listen for going to background / foreground and start/stop the service:
AppState.addEventListener('change', (state) => {
    if (state === 'background') {
        console.log('AppState → background: starting service');
        NativeModules.BackgroundService.start();
    } else if (state === 'active') {
        console.log('AppState → active: stopping service');
        NativeModules.BackgroundService.stop();
    }
});

// 3️⃣ Finally register your normal React‑Native app component:
AppRegistry.registerComponent(appName, () => App);