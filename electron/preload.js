const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke('print:list-printers'),
  getPrintSettings: () => ipcRenderer.invoke('print:get-settings'),
  savePrintSettings: (payload) => ipcRenderer.invoke('print:save-settings', payload),
  printPdfSilently: (payload) => ipcRenderer.invoke('print:pdf:silent', payload),
  printHtmlSilently: (payload) => ipcRenderer.invoke('print:html:silent', payload),
  printTestPage: (payload) => ipcRenderer.invoke('print:test-page', payload),
  openDevTools: () => ipcRenderer.invoke('desktop:open-devtools'),
  savePdfFile: (payload) => ipcRenderer.invoke('file:save-pdf', payload),
  getUpdateStatus: () => ipcRenderer.invoke('app-update:get-status'),
  checkForUpdates: () => ipcRenderer.invoke('app-update:check'),
  installUpdate: () => ipcRenderer.invoke('app-update:install'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('app-update:status', listener);
    return () => ipcRenderer.removeListener('app-update:status', listener);
  },
});
