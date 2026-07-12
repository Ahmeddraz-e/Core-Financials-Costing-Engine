process.env.NODE_ENV = 'production';

const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
process.env.APPDATA_PATH = app.getPath('userData');

const path = require('path');
const fs = require('fs');
const http = require('http');

const logPath = path.join(app.getPath('userData'), 'app-debug.log');
const logStream = fs.createWriteStream(logPath, { flags: 'w' });

console.log = function(...args) {
  const msg = `[LOG ${new Date().toISOString()}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  process.stdout.write(msg);
  try { logStream.write(msg); } catch (e) {}
};

console.error = function(...args) {
  const msg = `[ERR ${new Date().toISOString()}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  process.stderr.write(msg);
  try { logStream.write(msg); } catch (e) {}
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});


let mainWindow;
let serverProcess;

// Function to check if the Express server is listening and ready
function checkServerReady(callback) {
  const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      callback(false);
    }
  });

  req.on('error', () => {
    callback(false);
  });

  req.end();
}

// Function to start the Express backend server
function startBackendServer() {
  try {
    console.log('Initializing LODing ERP Backend Server...');
    // We run the bundled production server
    require('./dist/server.cjs');
  } catch (error) {
    console.error('Failed to start backend Express server directly, trying fallback:', error);
  }
}

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: 'LODing ERP System',
    icon: path.join(__dirname, 'public', 'favicon.ico'), // Desktop app icon
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  });

  mainWindow.maximize();
  mainWindow.show();

  // Hide the default Electron utility menu for a polished, professional, native look
  mainWindow.setMenuBarVisibility(false);

  // Prevent keyboard shortcuts from opening DevTools in production
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault();
      }
    });
  }

  // Pipe front-end console messages to main process console (recorded in app-debug.log)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const lvl = levels[level] || 'LOG';
    console.log(`[RENDERER ${lvl}] (${path.basename(sourceId)}:${line}) ${message}`);
  });

  // Poll the Express server until it is fully started, then load the URL
  const pollInterval = setInterval(() => {
    checkServerReady((ready) => {
      if (ready) {
        clearInterval(pollInterval);
        mainWindow.loadURL('http://127.0.0.1:3000');
        console.log('LODing ERP UI successfully loaded in desktop window.');
      }
    });
  }, 150);

  // Fallback timeout to stop polling after 10 seconds
  setTimeout(() => {
    clearInterval(pollInterval);
  }, 10000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Open external links (like owner email or help resources) in the user's default browser instead of inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC handler: open native folder picker dialog
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC handler: open native file picker for backup .db files
ipcMain.handle('dialog:selectBackupFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Database Backup Files', extensions: ['db'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

// Start backend server as soon as Electron starts
startBackendServer();

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
