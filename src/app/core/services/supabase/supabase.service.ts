import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly storageKey = 'saltorsystem-auth-token';
  private clientInstance: ReturnType<typeof createClient> | null = null;
  private authListenerBound = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityListenerBound = false;
  private readonly refreshIntervalMs = 3 * 60 * 1000;
  private readonly refreshBeforeExpirationSeconds = 10 * 60;
  private refreshHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  get url(): string {
    return environment?.supabase?.url || '';
  }

  get schema(): string {
    return environment?.supabase?.schema || 'public';
  }

  get enabled(): boolean {
    return Boolean(
      environment?.supabase?.enabled &&
        environment?.supabase?.url &&
        environment?.supabase?.anonKey
    );
  }

  get client(): ReturnType<typeof createClient> | null {
    if (!this.enabled) {
      return null;
    }
    if (!this.clientInstance) {
      const options: any = {
        db: {
          schema: this.schema,
        },
        auth: {
          storageKey: this.storageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          lockAcquireTimeout: 5000,
          // Evita conflictos del Navigator LockManager en algunos navegadores/escenarios Angular.
          lock: async (_name: string, _timeout: number, fn: () => Promise<any>) =>
            await fn(),
        },
      };
      this.clientInstance = createClient(
        this.url,
        environment.supabase.anonKey,
        options
      );
      this.bindAuthListener(this.clientInstance as any);
      this.bindSessionKeepAlive();
    }
    return this.clientInstance;
  }

  async recoverSession(): Promise<boolean> {
    const client = this.client;
    if (!client?.auth) return false;

    try {
      const { data } = await client.auth.getSession();
      const session = data?.session;
      if (!session) return false;

      if (this.shouldRefreshJwt(session.access_token)) {
        const { data: refreshed, error } = await client.auth.refreshSession();
        if (error || !refreshed?.session?.access_token) return false;
        localStorage.setItem('authToken', String(refreshed.session.access_token).trim());
        return true;
      }

      localStorage.setItem('authToken', String(session.access_token || '').trim());
      return true;
    } catch {
      // Si el refresh token ya no es valido, la app seguira el flujo normal de login.
      return false;
    }
  }

  clearAuthSession(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('authToken');
    const client = this.clientInstance as any;
    if (client?.auth?.signOut) {
      void client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    this.clientInstance = null;
    this.authListenerBound = false;
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (typeof window !== 'undefined' && this.refreshHandler) {
      window.removeEventListener('focus', this.refreshHandler);
      window.removeEventListener('online', this.refreshHandler);
    }
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.refreshHandler = null;
    this.visibilityHandler = null;
    this.visibilityListenerBound = false;
  }

  private bindAuthListener(client: any): void {
    if (this.authListenerBound || !client?.auth?.onAuthStateChange) {
      return;
    }

    client.auth.onAuthStateChange((_event: string, session: any) => {
      const token = String(session?.access_token || '').trim();

      if (token) {
        localStorage.setItem('authToken', token);
        return;
      }

      localStorage.removeItem('authToken');
    });

    this.authListenerBound = true;
  }

  private bindSessionKeepAlive(): void {
    if (!this.keepAliveTimer && typeof window !== 'undefined') {
      this.keepAliveTimer = setInterval(() => {
        void this.recoverSession();
      }, this.refreshIntervalMs);
    }

    if (this.visibilityListenerBound || typeof window === 'undefined') {
      return;
    }

    this.refreshHandler = () => void this.recoverSession();
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.refreshHandler?.();
      }
    };
    window.addEventListener('focus', this.refreshHandler);
    window.addEventListener('online', this.refreshHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.visibilityListenerBound = true;
  }

  private shouldRefreshJwt(token: string): boolean {
    try {
      const parts = String(token || '').split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      const exp = Number(payload?.exp || 0);
      if (!exp) return true;
      return exp <=
        Math.floor(Date.now() / 1000) + this.refreshBeforeExpirationSeconds;
    } catch {
      return true;
    }
  }
}
