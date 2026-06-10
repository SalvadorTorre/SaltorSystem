const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke('print:list-printers'),
  getPrintSettings: () => ipcRenderer.invoke('print:get-settings'),
  savePrintSettings: (payload) => ipcRenderer.invoke('print:save-settings', payload),
  printPdfSilently: (payload) => ipcRenderer.invoke('print:pdf:silent', payload),
  printHtmlSilently: (payload) => ipcRenderer.invoke('print:html:silent', payload),
  printTestPage: (payload) => ipcRenderer.invoke('print:test-page', payload),
  savePdfFile: (payload) => ipcRenderer.invoke('file:save-pdf', payload),
});
