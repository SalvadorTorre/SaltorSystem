const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { autoUpdater } = require('electron-updater');

const isDev = !!process.env.ELECTRON_START_URL;
const PRINT_PROFILE_KEYS = ['factura', 'ticket', 'reporte'];
const isWindows = process.platform === 'win32';
const pdfPrinter = isWindows ? require('pdf-to-printer') : null;
let mainWindow = null;
let autoUpdaterReady = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPrintSettingsPath() {
  return path.join(app.getPath('userData'), 'printing-settings.json');
}

function createDefaultProfile(overrides = {}) {
  return {
    deviceName: '',
    useSystemDefault: true,
    copies: 1,
    ...overrides,
  };
}

function getDefaultPrintSettings() {
  return {
    version: 1,
    updatedAt: null,
    profiles: {
      factura: createDefaultProfile(),
      ticket: createDefaultProfile(),
      reporte: createDefaultProfile(),
    },
  };
}

function normalizeProfile(profile, fallback) {
  const deviceName =
    typeof profile?.deviceName === 'string'
      ? profile.deviceName.trim()
      : fallback.deviceName;

  return {
    deviceName,
    useSystemDefault: deviceName
      ? false
      : typeof profile?.useSystemDefault === 'boolean'
      ? profile.useSystemDefault
      : fallback.useSystemDefault,
    copies: Math.max(1, Math.min(5, Number(profile?.copies) || fallback.copies)),
  };
}

function readPrintSettings() {
  const defaults = getDefaultPrintSettings();
  const filepath = getPrintSettingsPath();

  try {
    if (!fs.existsSync(filepath)) return defaults;
    const raw = fs.readFileSync(filepath, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      version: 1,
      updatedAt: parsed?.updatedAt || null,
      profiles: {
        factura: normalizeProfile(parsed?.profiles?.factura, defaults.profiles.factura),
        ticket: normalizeProfile(parsed?.profiles?.ticket, defaults.profiles.ticket),
        reporte: normalizeProfile(parsed?.profiles?.reporte, defaults.profiles.reporte),
      },
    };
  } catch {
    return defaults;
  }
}

function sanitizePdfFilename(filename) {
  const rawName =
    typeof filename === 'string' && filename.trim()
      ? filename.trim()
      : `cotizacion-${Date.now()}.pdf`;
  const sanitized = rawName.replace(/[\\/:*?"<>|]/g, '-');
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

function savePdfFile({ base64Data, directory, filename } = {}) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { success: false, error: 'No se recibio el contenido del PDF.' };
  }

  const targetDir =
    typeof directory === 'string' && directory.trim()
      ? directory.trim()
      : 'C:\\cotizacion';
  const filepath = path.join(targetDir, sanitizePdfFilename(filename));

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    return { success: true, filepath };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'No se pudo guardar el PDF.',
    };
  }
}

function savePrintSettings(input) {
  const current = readPrintSettings();
  const next = {
    version: 1,
    updatedAt: new Date().toISOString(),
    profiles: {
      factura: normalizeProfile(input?.profiles?.factura, current.profiles.factura),
      ticket: normalizeProfile(input?.profiles?.ticket, current.profiles.ticket),
      reporte: normalizeProfile(input?.profiles?.reporte, current.profiles.reporte),
    },
  };

  fs.writeFileSync(getPrintSettingsPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function resolvePrintDeviceName(deviceName, profileKey) {
  const customDevice = typeof deviceName === 'string' ? deviceName.trim() : '';
  if (customDevice) return customDevice;

  if (!PRINT_PROFILE_KEYS.includes(profileKey)) {
    return undefined;
  }

  const settings = readPrintSettings();
  const profile = settings?.profiles?.[profileKey];
  if (!profile || profile.useSystemDefault) return undefined;

  const savedDevice = String(profile.deviceName || '').trim();
  return savedDevice || undefined;
}

function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() || mainWindow || BrowserWindow.getAllWindows()[0] || null;
}

async function listAvailablePrinters(browserWindow) {
  if (isWindows && pdfPrinter?.getPrinters) {
    try {
      const [printers, defaultPrinter] = await Promise.all([
        pdfPrinter.getPrinters(),
        pdfPrinter.getDefaultPrinter().catch(() => null),
      ]);
      const defaultName = String(defaultPrinter?.name || '').trim();

      return (printers || []).map((printer) => {
        const name = String(printer.name || '').trim();
        return {
          name,
          displayName: name,
          isDefault: name === defaultName,
          status: 0,
        };
      });
    } catch (error) {
      console.warn('[Electron] No se pudo listar impresoras con pdf-to-printer:', error);
    }
  }

  const focused = browserWindow || getFocusedWindow();
  if (!focused) return [];

  try {
    const printers = await focused.webContents.getPrintersAsync();
    return printers.map((printer) => ({
      name: String(printer.name || '').trim(),
      displayName: printer.displayName,
      isDefault: !!printer.isDefault,
      status: printer.status,
    }));
  } catch (error) {
    console.warn('[Electron] No se pudo listar impresoras con Electron:', error);
    return [];
  }
}

async function validatePrinterDeviceName(browserWindow, deviceName) {
  const requested = String(deviceName || '').trim();
  if (!requested) return undefined;

  try {
    const printers = await listAvailablePrinters(browserWindow);
    const match = printers.find((printer) => String(printer.name || '').trim() === requested);
    return match ? match.name : undefined;
  } catch {
    return undefined;
  }
}

function getProfileCopies(profileKey) {
  if (!PRINT_PROFILE_KEYS.includes(profileKey)) return 1;
  const settings = readPrintSettings();
  return Math.max(1, Math.min(5, Number(settings?.profiles?.[profileKey]?.copies) || 1));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    if (/^(https?:|mailto:)/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'saltor-system', 'index.html'));
  }

  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

function cleanupFile(filepath) {
  if (!filepath) return;
  try {
    fs.unlinkSync(filepath);
  } catch {}
}

async function printPdfSilently({ base64Data, deviceName, profileKey } = {}) {
  if (!base64Data || typeof base64Data !== 'string') {
    return { success: false, error: 'No se recibió PDF en base64 para imprimir.' };
  }

  const tmpFile = path.join(os.tmpdir(), `saltor-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  try {
    const configuredDeviceName = resolvePrintDeviceName(deviceName, profileKey);
    const copies = getProfileCopies(profileKey);
    fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'));
    const fileSize = fs.statSync(tmpFile).size;
    const resolvedDeviceName = await validatePrinterDeviceName(printWindow, configuredDeviceName);

    console.log('[Electron printPdfSilently]', {
      profileKey,
      configuredDeviceName,
      resolvedDeviceName,
      copies,
      fileSize,
      tmpFile,
    });

    if (configuredDeviceName && !resolvedDeviceName) {
      return {
        success: false,
        error: `La impresora guardada para ${profileKey || 'este perfil'} no existe en esta computadora. Revisa la configuración desktop.`,
      };
    }

    if (isWindows && pdfPrinter?.print) {
      await pdfPrinter.print(tmpFile, {
        printer: resolvedDeviceName,
        copies,
        silent: true,
      });

      console.log('[Electron printPdfSilently] PDF enviado a impresora por pdf-to-printer');

      return {
        success: true,
        error: null,
      };
    }

    await printWindow.loadURL(`file://${tmpFile}`);
    await wait(700);

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: resolvedDeviceName,
          copies,
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

async function printTestPage({ profileKey, deviceName } = {}) {
  const resolvedProfileKey = PRINT_PROFILE_KEYS.includes(profileKey) ? profileKey : 'ticket';
  const resolvedDeviceName = resolvePrintDeviceName(deviceName, resolvedProfileKey);
  const copies = getProfileCopies(resolvedProfileKey);
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Prueba de impresion</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .card { border: 2px solid #2563eb; border-radius: 12px; padding: 18px; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          p { margin: 6px 0; font-size: 14px; }
          .meta { margin-top: 16px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Saltor System</h1>
          <p>Prueba de impresion desktop</p>
          <p>Perfil: <strong>${escapeHtml(resolvedProfileKey)}</strong></p>
          <p>Impresora: <strong>${escapeHtml(resolvedDeviceName || 'Predeterminada del sistema')}</strong></p>
          <p class="meta">Generado: ${escapeHtml(new Date().toLocaleString())}</p>
        </div>
      </body>
    </html>
  `;

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await wait(250);
    const validatedDeviceName = await validatePrinterDeviceName(printWindow, resolvedDeviceName);

    if (resolvedDeviceName && !validatedDeviceName) {
      return {
        success: false,
        error: `La impresora guardada para ${resolvedProfileKey} no existe en esta computadora.`,
      };
    }

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: validatedDeviceName,
          copies,
        },
        (success, failureReason) => resolve({ success, failureReason })
      );
    });

    return {
      success: !!printResult.success,
      error: printResult.success ? null : (printResult.failureReason || 'No se pudo imprimir la pagina de prueba.'),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Fallo la impresion de prueba.',
    };
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

async function printHtmlSilently({ html, deviceName, profileKey } = {}) {
  if (!html || typeof html !== 'string') {
    return { success: false, error: 'No se recibió contenido HTML para imprimir.' };
  }

  const resolvedProfileKey = PRINT_PROFILE_KEYS.includes(profileKey) ? profileKey : 'reporte';
  const resolvedDeviceName = resolvePrintDeviceName(deviceName, resolvedProfileKey);
  const copies = getProfileCopies(resolvedProfileKey);
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await wait(250);
    const validatedDeviceName = await validatePrinterDeviceName(printWindow, resolvedDeviceName);

    if (resolvedDeviceName && !validatedDeviceName) {
      return {
        success: false,
        error: `La impresora guardada para ${resolvedProfileKey} no existe en esta computadora.`,
      };
    }

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: validatedDeviceName,
          copies,
        },
        (success, failureReason) => resolve({ success, failureReason })
      );
    });

    return {
      success: !!printResult.success,
      error: printResult.success ? null : (printResult.failureReason || 'No se pudo imprimir el documento HTML.'),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Falló la impresión HTML en Electron.',
    };
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

ipcMain.handle('print:list-printers', async () => {
  const printers = await listAvailablePrinters(getFocusedWindow());
  return printers.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
  });
});

ipcMain.handle('print:get-settings', async () => readPrintSettings());
ipcMain.handle('print:save-settings', async (_evt, payload) => savePrintSettings(payload));
ipcMain.handle('print:pdf:silent', async (_evt, payload) => printPdfSilently(payload));
ipcMain.handle('print:test-page', async (_evt, payload) => printTestPage(payload));
ipcMain.handle('print:html:silent', async (_evt, payload) => printHtmlSilently(payload));
ipcMain.handle('file:save-pdf', async (_evt, payload) => savePdfFile(payload));

function setupAutoUpdater() {
  if (autoUpdaterReady || isDev || !app.isPackaged) {
    return;
  }

  autoUpdaterReady = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[autoUpdater] Buscando actualizaciones...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[autoUpdater] Actualización disponible:', info?.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[autoUpdater] No hay actualizaciones nuevas.');
  });

  autoUpdater.on('error', (error) => {
    console.error('[autoUpdater] Error:', error);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log('[autoUpdater] Actualización descargada:', info?.version);
    const result = await dialog.showMessageBox(getFocusedWindow() || undefined, {
      type: 'info',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
      title: 'Actualización lista',
      message: `Se descargó la versión ${info?.version || app.getVersion()} de Saltor System.`,
      detail: 'La actualización se instalará al reiniciar la aplicación.',
    });

    if (result.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('[autoUpdater] No se pudo iniciar la búsqueda de actualizaciones:', error);
    });
  }, 3000);
}

app.whenReady().then(() => {
  createMainWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
