import { Injectable } from '@angular/core';

export type DesktopPrintProfileKey = 'factura' | 'ticket' | 'reporte';

export interface DesktopPrintProfileSettings {
  deviceName: string;
  useSystemDefault: boolean;
  copies: number;
}

export interface DesktopPrinterInfo {
  name: string;
  displayName?: string;
  isDefault?: boolean;
  status?: number;
}

export interface DesktopPrintResult {
  success: boolean;
  error?: string | null;
}

export interface DesktopPrintSettings {
  version: number;
  updatedAt?: string | null;
  profiles: Record<DesktopPrintProfileKey, DesktopPrintProfileSettings>;
}

@Injectable({
  providedIn: 'root',
})
export class DesktopPrintSettingsService {
  private cache: DesktopPrintSettings | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isDesktop;
  }

  getDefaultSettings(): DesktopPrintSettings {
    return {
      version: 1,
      updatedAt: null,
      profiles: {
        factura: { deviceName: '', useSystemDefault: true, copies: 1 },
        ticket: { deviceName: '', useSystemDefault: true, copies: 1 },
        reporte: { deviceName: '', useSystemDefault: true, copies: 1 },
      },
    };
  }

  normalize(settings?: Partial<DesktopPrintSettings> | null): DesktopPrintSettings {
    const fallback = this.getDefaultSettings();
    const normalizeProfile = (
      profile: Partial<DesktopPrintProfileSettings> | undefined,
      base: DesktopPrintProfileSettings
    ): DesktopPrintProfileSettings => {
      const deviceName = String(profile?.deviceName || base.deviceName || '').trim();
      return {
        deviceName,
        useSystemDefault: deviceName
          ? false
          : typeof profile?.useSystemDefault === 'boolean'
          ? profile.useSystemDefault
          : base.useSystemDefault,
        copies: Math.max(1, Math.min(5, Number(profile?.copies) || base.copies)),
      };
    };

    return {
      version: 1,
      updatedAt: settings?.updatedAt || fallback.updatedAt,
      profiles: {
        factura: normalizeProfile(settings?.profiles?.factura, fallback.profiles.factura),
        ticket: normalizeProfile(settings?.profiles?.ticket, fallback.profiles.ticket),
        reporte: normalizeProfile(settings?.profiles?.reporte, fallback.profiles.reporte),
      },
    };
  }

  async load(): Promise<DesktopPrintSettings> {
    if (!this.isSupported()) {
      return this.getDefaultSettings();
    }

    const data = await window.electronAPI!.getPrintSettings();
    this.cache = this.normalize(data);
    return this.cache;
  }

  async save(settings: DesktopPrintSettings): Promise<DesktopPrintSettings> {
    const normalized = this.normalize(settings);
    if (!this.isSupported()) {
      this.cache = normalized;
      return normalized;
    }

    const saved = await window.electronAPI!.savePrintSettings(normalized);
    this.cache = this.normalize(saved);
    return this.cache;
  }

  async getProfileDeviceName(profileKey: DesktopPrintProfileKey): Promise<string | undefined> {
    const settings = this.cache || (await this.load());
    const profile = settings.profiles[profileKey];
    if (!profile || profile.useSystemDefault) return undefined;
    return profile.deviceName || undefined;
  }

  async printTestPage(
    profileKey: DesktopPrintProfileKey,
    deviceName?: string
  ): Promise<DesktopPrintResult> {
    if (!this.isSupported() || !window.electronAPI?.printTestPage) {
      return {
        success: false,
        error: 'La impresión de prueba solo está disponible en la app desktop.',
      };
    }

    return window.electronAPI.printTestPage({ profileKey, deviceName });
  }
}
