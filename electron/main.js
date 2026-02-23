const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const isDev = !app.isPackaged;

let CURRENT_WORKSPACE = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    backgroundColor: '#0f111a',
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  win.loadURL(startUrl);
  win.setMenuBarVisibility(false);
  
  win.once('ready-to-show', () => {
    win.show();
    // Открываем консоль разработчика в dev-режиме, чтобы вы видели ошибки
    if (isDev) win.webContents.openDevTools();
  });
}

// --- IPC Handlers ---

ipcMain.handle('select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  if (!folderPath) return null;
  try {
    const stats = await fs.stat(folderPath);
    CURRENT_WORKSPACE = stats.isDirectory() ? folderPath : path.dirname(folderPath);
    return { tree: await getFileTree(CURRENT_WORKSPACE), rootName: path.basename(CURRENT_WORKSPACE) };
  } catch (e) {
    return null;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(CURRENT_WORKSPACE, filePath);
  return await fs.readFile(fullPath, 'utf-8');
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(CURRENT_WORKSPACE, filePath);
  await fs.writeFile(fullPath, content);
  return true;
});

ipcMain.handle('save-as', async (event, content) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save File As',
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (canceled) return null;
  await fs.writeFile(filePath, content);
  return filePath;
});

ipcMain.handle('run-terminal', async (event, command) => {
  if (!CURRENT_WORKSPACE) return { stdout: '', stderr: 'No folder open' };
  return new Promise((resolve) => {
    exec(command, { cwd: CURRENT_WORKSPACE }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, error: error ? error.message : null });
    });
  });
});

async function getFileTree(dir) {
  const stats = await fs.stat(dir);
  const name = path.basename(dir) || dir;
  const id = path.relative(CURRENT_WORKSPACE, dir) || '.';
  if (!stats.isDirectory()) return { id, name, type: 'file', language: getLanguage(name) };
  const children = await fs.readdir(dir);
  const childNodes = await Promise.all(
    children
      .filter(child => !['node_modules', '.git', 'dist', '.vite'].includes(child))
      .map(async (child) => {
        try { return await getFileTree(path.join(dir, child)); } catch (e) { return null; }
      })
  );
  return {
    id, name, type: 'folder',
    children: childNodes.filter(n => n !== null).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
  };
}

function getLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = { '.js': 'javascript', '.ts': 'typescript', '.tsx': 'typescript', '.json': 'json', '.css': 'css', '.html': 'html', '.md': 'markdown' };
  return map[ext] || 'plaintext';
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
