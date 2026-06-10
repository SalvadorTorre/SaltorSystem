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

type ElectronUpdateStage =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

interface ElectronUpdateStatus {
  supported: boolean;
  stage: ElectronUpdateStage;
  message: string;
  currentVersion: string;
  availableVersion?: string | null;
  downloadedVersion?: string | null;
  progress?: number | null;
  checkedAt?: string | null;
  error?: string | null;
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
  openDevTools: () => Promise<ElectronPrintResult>;
  savePdfFile: (payload: ElectronSavePdfRequest) => Promise<ElectronSavePdfResult>;
  getUpdateStatus: () => Promise<ElectronUpdateStatus>;
  checkForUpdates: () => Promise<ElectronUpdateStatus>;
  installUpdate: () => Promise<{ success: boolean; error?: string | null }>;
  onUpdateStatus: (
    callback: (payload: ElectronUpdateStatus) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
