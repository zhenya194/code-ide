const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // Настройки для красивого окна
    titleBarStyle: 'hiddenInset', // Скрывает стандартную строку заголовка (для Mac)
    backgroundColor: '#0f111a',
    show: false, // Показывать только после загрузки
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Включаем поддержку прозрачности и блюра (Vibrancy) если нужно
  // Но для кроссплатформенности лучше использовать CSS backdrop-filter

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  win.loadURL(startUrl);

  win.once('ready-to-show', () => {
    win.show();
  });

  // Отключаем стандартное меню для чистого вида
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
