const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const isDev = !!process.env.ELECTRON_START_URL;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'saltor-system', 'index.html'));
  }

  return win;
}

function cleanupFile(filepath) {
  if (!filepath) return;
  try {
    fs.unlinkSync(filepath);
  } catch {}
}

async function printPdfSilently({ base64Data, deviceName } = {}) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { success: false, error: 'No se recibió PDF en base64 para imprimir.' };
  }

  const tmpFile = path.join(os.tmpdir(), `saltor-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'));
    await printWindow.loadURL(`file://${tmpFile}`);

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: deviceName || undefined,
        },
        (success, failureReason) => {
          resolve({ success, failureReason });
        }
      );
    });

    return {
      success: !!printResult.success,
      error: printResult.success ? null : (printResult.failureReason || 'No se pudo imprimir.'),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Falló la impresión silenciosa en Electron.',
    };
  } finally {
    cleanupFile(tmpFile);
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

ipcMain.handle('print:list-printers', async () => {
  const focused = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!focused) return [];

  try {
    const printers = await focused.webContents.getPrintersAsync();
    return printers.map((p) => ({
      name: p.name,
      displayName: p.displayName,
      isDefault: !!p.isDefault,
      status: p.status,
    }));
  } catch {
    return [];
  }
});

ipcMain.handle('print:pdf:silent', async (_evt, payload) => printPdfSilently(payload));

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
