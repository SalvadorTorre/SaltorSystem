const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const isDev = !!process.env.ELECTRON_START_URL;
const PRINT_PROFILE_KEYS = ['factura', 'ticket', 'reporte'];

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
  return {
    deviceName: typeof profile?.deviceName === 'string' ? profile.deviceName.trim() : fallback.deviceName,
    useSystemDefault:
      typeof profile?.useSystemDefault === 'boolean'
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
      sandbox: true,
    },
  });

  try {
    const resolvedDeviceName = resolvePrintDeviceName(deviceName, profileKey);
    const copies = getProfileCopies(profileKey);
    fs.writeFileSync(tmpFile, Buffer.from(base64Data, 'base64'));
    await printWindow.loadURL(`file://${tmpFile}`);

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
      sandbox: true,
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

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: resolvedDeviceName,
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
      sandbox: true,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const printResult = await new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: resolvedDeviceName,
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
  const focused = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!focused) return [];

  try {
    const printers = await focused.webContents.getPrintersAsync();
    return printers
      .map((p) => ({
      name: p.name,
      displayName: p.displayName,
      isDefault: !!p.isDefault,
      status: p.status,
      }))
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
      });
  } catch {
    return [];
  }
});

ipcMain.handle('print:get-settings', async () => readPrintSettings());
ipcMain.handle('print:save-settings', async (_evt, payload) => savePrintSettings(payload));
ipcMain.handle('print:pdf:silent', async (_evt, payload) => printPdfSilently(payload));
ipcMain.handle('print:test-page', async (_evt, payload) => printTestPage(payload));
ipcMain.handle('print:html:silent', async (_evt, payload) => printHtmlSilently(payload));

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
