const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Handle Web Serial API permissions automatically
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial') {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      // Pick the first available port
      callback(portList[0].portId);
    } else {
      callback(''); // Could not find any matching devices
    }
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    // In development mode, the Vite server is already running on port 3000
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production, start the bundled Express server
    process.env.NODE_ENV = 'production';
    
    // Find a free port
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => {
        process.env.PORT = port.toString();
        // Require the compiled Express server
        require(path.join(__dirname, 'dist', 'server.cjs'));
        
        // Give it a moment to boot up before loading the URL
        setTimeout(() => {
          mainWindow.loadURL(`http://localhost:${port}`);
        }, 500);
      });
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
