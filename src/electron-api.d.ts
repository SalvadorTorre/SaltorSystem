interface ElectronPrintRequest {
  base64Data: string;
  deviceName?: string;
  profileKey?: ElectronPrintProfileKey;
}

interface ElectronPrintResult {
  success: boolean;
  error?: string | null;
}

interface ElectronSavePdfRequest {
  base64Data: string;
  directory?: string;
  filename?: string;
}

interface ElectronSavePdfResult {
  success: boolean;
  filepath?: string;
  error?: string | null;
}

type ElectronPrintProfileKey = 'factura' | 'ticket' | 'reporte';

interface ElectronPrinterInfo {
  name: string;
  displayName?: string;
  isDefault?: boolean;
  status?: number;
}

interface ElectronPrintProfileSettings {
  deviceName: string;
  useSystemDefault: boolean;
  copies: number;
}

interface ElectronPrintSettings {
  version: number;
  updatedAt?: string | null;
  profiles: Record<ElectronPrintProfileKey, ElectronPrintProfileSettings>;
}

interface ElectronAPI {
  isDesktop: boolean;
  listPrinters: () => Promise<ElectronPrinterInfo[]>;
  getPrintSettings: () => Promise<ElectronPrintSettings>;
  savePrintSettings: (payload: ElectronPrintSettings) => Promise<ElectronPrintSettings>;
  printPdfSilently: (payload: ElectronPrintRequest) => Promise<ElectronPrintResult>;
  printHtmlSilently: (payload: {
    html: string;
    deviceName?: string;
    profileKey?: ElectronPrintProfileKey;
  }) => Promise<ElectronPrintResult>;
  printTestPage: (payload: {
    profileKey: ElectronPrintProfileKey;
    deviceName?: string;
  }) => Promise<ElectronPrintResult>;
  savePdfFile: (payload: ElectronSavePdfRequest) => Promise<ElectronSavePdfResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
