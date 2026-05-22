interface ElectronPrintRequest {
  base64Data: string;
  deviceName?: string;
}

interface ElectronPrintResult {
  success: boolean;
  error?: string | null;
}

interface ElectronPrinterInfo {
  name: string;
  displayName?: string;
  isDefault?: boolean;
  status?: number;
}

interface ElectronAPI {
  isDesktop: boolean;
  listPrinters: () => Promise<ElectronPrinterInfo[]>;
  printPdfSilently: (payload: ElectronPrintRequest) => Promise<ElectronPrintResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
