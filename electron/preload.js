const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke('print:list-printers'),
  printPdfSilently: (payload) => ipcRenderer.invoke('print:pdf:silent', payload),
});
